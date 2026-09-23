const { $ } = require("bun");
const { join, basename } = require("path");
const { exists, readdir, readFile, writeFile, mkdir, rm } = require("fs/promises");

const searchFiles = async (dir, targetName) => {
  const files = await readdir(dir, { withFileTypes: true });
  let results = [];
  for (const file of files) {
    const fullPath = join(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(await searchFiles(fullPath, targetName));
    } else if (file.name === targetName) {
      results.push(fullPath);
    }
  }
  return results;
};

const ask = (question, fallback) => {
  return new Promise((resolve) => {
    process.stdout.write(`${question} `);
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (data) => {
      const answer = data.toString().trim();
      resolve(answer || fallback);
    });
  });
};

Bun.reportError = (e) => {
  console.error(e);
};

const helpText = `Usage: helper <options>

Modes:
  --proc=kill         Free a port by PID
  --proc=install      Install dependencies (bun install + symlink node_modules)
  --proc=devsetup     Full dev tree setup (framework + atomic + component + install)

Options:
  --help, -h          Show this help message
  --proc=<mode>       Required: "kill", "install", or "devsetup"
  --dir=<path>        Search directory for package.json files (default: "/opt/share")
  --target=<path>     Symlink node_modules to this directory (used with "install")
  --user=<user>       Username for path, or "disable" to skip user path (default: current user)
  --port=<number>     Port number to check/kill (used with "kill")
  --project=<name>    Project name (used with "devsetup")
  --engine=<type>     webbunjs, webnodehonojs, appservicejs, deskelectronjs (default: webnodehonojs)
  --comp=<name>       Component name for devsetup (optional — new skeleton or existing repo)
  --credentials=<user:pass>  Gitea user:pass

Examples:
  # Free a port
  helper --proc=kill --port=3000

  # Re-install dependencies (after package.json changes)
  helper --proc=install --dir=/opt/share/prj/myapp

  # Full dev setup: framework + atomic + component + auto-install
  helper --proc=devsetup --project=myapp --credentials=user:pass

  # Dev setup with component (new skeleton)
  helper --proc=devsetup --project=myapp --comp=newcomp --credentials=user:pass

  # Dev setup with existing component repo
  helper --proc=devsetup --project=myapp --comp=oqc --engine=webnodehonojs --credentials=user:pass
`;

// Check for help flag
const helpFlags = Bun.argv.slice(2).some(a => a === "--help" || a === "-h");
if (helpFlags || Bun.argv.length <= 2) {
  console.log(helpText);
  process.exit(0);
}

let argv = {};
let proc = "";
let dir = ".";
let build = "/build";
let whoami = await $`whoami`.text();
whoami = `/${whoami.trim()}`;
let target;
Bun.argv.map((value) => {
  if (value.match("=")) {
    let arg = value.split("=");
    let args_key = arg[0].replace(/[\(,\),\.,\/,\-,\_, ,]/g, "");
    argv[args_key] = arg[1];
  }
});
if (argv.proc) proc = argv.proc;
if (argv.dir) dir = argv.dir;
if (argv.target) target = argv.target;
if (argv.user && argv.user == "disable") whoami = "";
if (!argv.project) argv.project = "myproject";
if (!argv.engine) argv.engine = "webnodehonojs";

const gitClone = async (repoPath, dest) => {
  const [gituser, gitpass] = argv.credentials.split(":");
  await $`${{ raw: `GIT_TERMINAL_PROMPT=0 git clone --depth=1 "http://${gituser}:${gitpass}@${repoPath}" "${dest}"` }}`;
};

(async () => {
  switch (proc) {
  case "devsetup":
  const devRoot = "/opt/share";
  const devPrj = join(devRoot, "prj", argv.project);
  const devComponents = join(devRoot, "components");
  const devAtomic = join(devRoot, "atomic");
  const devFramework = join(devRoot, "framework");
  const validEngines = ["webbunjs", "webnodehonojs", "appservicejs", "deskelectronjs"];
  const FRAMEWORKS = { oricommjs_v2: "vsrnd.synology.me:3000/2rd_system/oricommjs_v2.git" };

  // Step 1: Credential Check
  let credentials = argv.credentials;
  if (!credentials) {
    console.log("\n=== Development Tree Setup ===\n");
    credentials = await ask("Gitea user:pass?", "");
    if (!credentials) { console.log("Credentials required. Aborted."); break; }
  }
  argv.credentials = credentials;

  // Validate credentials
  console.log("Validating credentials...");
  const testClone = join(build, "__test_clone");
  await $`rm -rf ${testClone}`;
  let validCreds = true;
  const testResult = await $`GIT_TERMINAL_PROMPT=0 git ls-remote "http://${argv.credentials}@vsrnd.synology.me:3000/2rd_system/oricommjs_v2.git" HEAD`;
  const testText = typeof testResult.text === "function" ? await testResult.text() : testResult.text;
  if (testResult.exitCode !== 0 || !String(testText).trim()) {
    validCreds = false;
  }
  await $`rm -rf ${testClone}`;
  if (!validCreds) {
    console.log("Credentials rejected by Gitea.");
    credentials = await ask("Enter Gitea user:pass?", "");
    if (!credentials) { console.log("Credentials required. Aborted."); break; }
    argv.credentials = credentials;
  } else { console.log("Credentials OK."); }

  // Step 2: Project Directory Check
  if (await exists(devPrj)) {
    console.log(`Project directory already exists: ${devPrj}`);
    break;
  }
  await mkdir(devPrj, { recursive: true });
  await mkdir(devComponents, { recursive: true });
  await mkdir(devAtomic, { recursive: true });
  await mkdir(devFramework, { recursive: true });

  // Step 3: Framework (always oricommjs_v2) — list tags for user to select
  const frameworkName = "oricommjs_v2";
  const frameworkRepo = FRAMEWORKS[frameworkName];

  // Step 4: Engine Selection (default webnodehonojs, no prompt)
  let engine = argv.engine || "webnodehonojs";
  if (!validEngines.includes(engine)) {
    console.log(`Invalid engine: ${engine}. Valid: ${validEngines.join(", ")}`);
    break;
  }

  // List all tags from framework repo
  console.log(`\nListing ${frameworkName} framework tags...`);
  const fwTagList = [];
  const tagResult = await $`GIT_TERMINAL_PROMPT=0 git ls-remote --tags "http://${argv.credentials}@vsrnd.synology.me:3000/2rd_system/${frameworkName}.git"`;
  const tagText = typeof tagResult.text === "function" ? await tagResult.text() : tagResult.text;
  const tagOutput = String(tagText);
  if (tagResult.exitCode === 0 && tagOutput.trim()) {
    for (const line of tagOutput.trim().split("\n")) {
      const parts = line.split("\t");
      if (parts.length >= 2) {
        const ref = parts[1];
        if (ref.startsWith("refs/tags/")) {
          const tagName = ref.replace("refs/tags/", "");
          fwTagList.push(tagName);
        }
      }
    }
  }

  let selectedTag = "HEAD";
  if (fwTagList.length > 0) {
    console.log(`\n   Available tags (${fwTagList.length}):`);
    fwTagList.forEach((tag, i) => { console.log(`     ${i + 1}) ${tag}`); });
    console.log(`     0) HEAD (latest)`);
    const tagChoice = await ask(`   Select tag? (default: 0)`, "0");
    const choiceIdx = parseInt(tagChoice) - 1;
    if (choiceIdx >= 0 && choiceIdx < fwTagList.length) {
      selectedTag = fwTagList[choiceIdx];
    }
  }

  // Clone Framework at selected tag
  console.log(`\nCloning ${frameworkName} framework at tag: ${selectedTag}...`);
  const fwTmp = join(build, `__${frameworkName}_fw_tmp`);
  await $`rm -rf ${fwTmp}`;
  await $`${{ raw: `GIT_TERMINAL_PROMPT=0 git clone "http://${argv.credentials}@vsrnd.synology.me:3000/2rd_system/${frameworkName}.git" "${fwTmp}"` }}`;
  if (selectedTag !== "HEAD") {
    await $`cd ${fwTmp} && git checkout tags/${selectedTag} -f`;
  }

  // Setup Shared Directories
  console.log(`Setting up framework at ${devFramework}...`);
  await $`rm -rf ${devFramework}`;
  await mkdir(devFramework, { recursive: true });
  await $`cp -r ${fwTmp}/. ${devFramework}/`;

  // Atomic modules — copy from framework (atom, molecule, organism, template, page)
  console.log("Setting up atomic modules from framework...");
  for (const atomName of ["atom", "molecule", "organism", "template", "page"]) {
    const atomSrc = join(devFramework, "atomic", atomName);
    const atomDest = join(devAtomic, atomName);
    if (await exists(atomSrc)) {
      await $`rm -rf ${atomDest}`;
      await mkdir(atomDest, { recursive: true });
      await $`cp -r ${atomSrc}/. ${atomDest}/`;
    }
  }

  // Step 5: Component Mode (--comp)
  const compMode = !!argv.comp;
  const compName = argv.comp;
  let compExists = false;
  let compPkgDeps = { dependencies: {}, devDependencies: {} };
  let compAtomNames = []; // atoms declared in component package.json
  let compPkg = {}; // component package.json for later use

  if (compMode) {
    console.log(`\nComponent mode: ${compName}`);
    const compTmp = join(build, `__${compName}_comp_tmp`);
    const compDest = join(devComponents, compName);

    // Check if component repo already exists locally
    console.log(`Checking if component "${compName}" exists locally...`);
    const localCompExists = await exists(compDest);

    if (localCompExists) {
      // LOCAL EXISTS: use existing, just check tags
      console.log(`  Component "${compName}" already exists at ${compDest}`);
      compExists = true;

      // Show current active tag
      const currentTagResult = await $`cd ${compDest} && git describe --tags --exact-match 2>/dev/null`.catch(() => ({ exitCode: 1 }));
      const currentTag = currentTagResult.exitCode === 0 ? (typeof currentTagResult.text === "function" ? await currentTagResult.text() : currentTagResult.text).trim() : "HEAD";
      console.log(`  Active tag: ${currentTag}`);
    } else {
      // LOCAL DOES NOT EXIST: check Gitea, then clone
      console.log(`  Component "${compName}" does NOT exist locally — checking Gitea...`);
      const checkResult = await $`GIT_TERMINAL_PROMPT=0 git ls-remote "http://${argv.credentials}@vsrnd.synology.me:3000/components/${compName}.git" HEAD`;
      const checkText = typeof checkResult.text === "function" ? await checkResult.text() : checkResult.text;
      if (checkResult.exitCode === 0 && String(checkText).trim()) {
        compExists = true;

        // List tags for user to select
        console.log(`  Listing ${compName} tags...`);
        const compTagList = [];
        const tagResult = await $`GIT_TERMINAL_PROMPT=0 git ls-remote --tags "http://${argv.credentials}@vsrnd.synology.me:3000/components/${compName}.git"`;
        const tagText = typeof tagResult.text === "function" ? await tagResult.text() : tagResult.text;
        const tagOutput = String(tagText);
        if (tagResult.exitCode === 0 && tagOutput.trim()) {
          for (const line of tagOutput.trim().split("\n")) {
            const parts = line.split("\t");
            if (parts.length >= 2) {
              const ref = parts[1];
              if (ref.startsWith("refs/tags/")) {
                const tagName = ref.replace("refs/tags/", "");
                compTagList.push(tagName);
              }
            }
          }
        }

        let selectedTag = "HEAD";
        if (compTagList.length > 0) {
          console.log(`\n   Available tags (${compTagList.length}):`);
          compTagList.forEach((tag, i) => { console.log(`     ${i + 1}) ${tag}`); });
          console.log(`     0) HEAD (latest)`);
          const tagChoice = await ask(`   Select tag? (default: 0)`, "0");
          const choiceIdx = parseInt(tagChoice) - 1;
          if (choiceIdx >= 0 && choiceIdx < compTagList.length) {
            selectedTag = compTagList[choiceIdx];
          }
        }

        console.log(`  Cloning ${compName} at tag: ${selectedTag}...`);
        await $`rm -rf ${compTmp}`;
        await $`${{ raw: `GIT_TERMINAL_PROMPT=0 git clone "http://${argv.credentials}@vsrnd.synology.me:3000/components/${compName}.git" "${compTmp}"` }}`;
        if (selectedTag !== "HEAD") {
          await $`cd ${compTmp} && git checkout tags/${selectedTag} -f`;
        }

        await $`rm -rf ${compDest}`;
        await mkdir(compDest, { recursive: true });
        await $`cp -a ${compTmp}/. ${compDest}/`;
        await $`rm -rf ${compTmp}`;
      } else {
        compExists = false;
        console.log(`  Component "${compName}" does NOT exist in Gitea — creating from scratch...`);
      }
    }

      // Merge component dependencies + resolve atomic modules
      const compPkgPath = join(compDest, "package.json");
      if (await exists(compPkgPath)) {
        compPkg = JSON.parse(await readFile(compPkgPath, "utf8"));
        if (compPkg.dependencies) Object.assign(compPkgDeps.dependencies, compPkg.dependencies);
        if (compPkg.devDependencies) Object.assign(compPkgDeps.devDependencies, compPkg.devDependencies);

        // Read ALL atomic sub-types: atom, molecule, organism, template, page
        const atomicReqs = compPkg.atomic || {};
        const atomicTypes = ["atom", "molecule", "organism", "template", "page"];
        
        for (const atomicType of atomicTypes) {
          const typeReqs = atomicReqs[atomicType] || {};
          const typeEntries = Object.entries(typeReqs).filter(([name, ver]) => ver && ver !== "");
          
          for (const [itemName, itemVer] of typeEntries) {
            const itemDest = join(devAtomic, atomicType, itemName);
            const itemTmp = join(build, `__${atomicType}_${itemName}_tmp`);

            // Check if already exists locally
            const localExists = await exists(itemDest);
            if (localExists) {
              const currentTagResult = await $`cd ${itemDest} && git describe --tags --exact-match 2>/dev/null`.catch(() => ({ exitCode: 1 }));
              const currentTag = currentTagResult.exitCode === 0 ? (typeof currentTagResult.text === "function" ? await currentTagResult.text() : currentTagResult.text).trim() : "HEAD";
              console.log(`\n  ${atomicType}/${itemName}@${itemVer} already exists at ${itemDest} (active: ${currentTag})`);
              // Read package.json for dependencies
              const itemPkgPath = join(itemDest, "package.json");
              if (await exists(itemPkgPath)) {
                const itemPkg = JSON.parse(await readFile(itemPkgPath, "utf8"));
                if (itemPkg.dependencies) Object.assign(compPkgDeps.dependencies, itemPkg.dependencies);
                if (itemPkg.devDependencies) Object.assign(compPkgDeps.devDependencies, itemPkg.devDependencies);
              }
            } else {
              console.log(`\nCloning ${atomicType}: ${itemName}@${itemVer}...`);
              await mkdir(itemDest, { recursive: true });
              await $`rm -rf ${itemTmp}`;

              // Determine clone URL based on atomic type
              let cloneUrl;
              if (atomicType === "atom") {
                cloneUrl = `vsrnd.synology.me:3000/2rd_system_atom/${itemName}.git`;
              } else if (atomicType === "molecule") {
                cloneUrl = `vsrnd.synology.me:3000/molecule/${itemName}.git`;
              } else if (atomicType === "organism") {
                cloneUrl = `vsrnd.synology.me:3000/organism/${itemName}.git`;
              } else if (atomicType === "template") {
                cloneUrl = `vsrnd.synology.me:3000/template/${itemName}.git`;
              } else if (atomicType === "page") {
                cloneUrl = `vsrnd.synology.me:3000/page/${itemName}.git`;
              }

              // Clone full repo first, then checkout tag
              const cloneResult = await $`GIT_TERMINAL_PROMPT=0 git clone "http://${argv.credentials}@${cloneUrl}" "${itemTmp}"`;
              if (cloneResult.exitCode === 0) {
                await $`cd ${itemTmp} && git checkout tags/${itemVer} -f`;
                await $`cp -a ${itemTmp}/. ${itemDest}/`;
                await $`rm -rf ${itemTmp}`;

                const itemPkgPath = join(itemDest, "package.json");
                if (await exists(itemPkgPath)) {
                  const itemPkg = JSON.parse(await readFile(itemPkgPath, "utf8"));
                  if (itemPkg.dependencies) Object.assign(compPkgDeps.dependencies, itemPkg.dependencies);
                  if (itemPkg.devDependencies) Object.assign(compPkgDeps.devDependencies, itemPkg.devDependencies);
                }
              } else {
                console.log(`  WARNING: Failed to clone ${atomicType}/${itemName}@${itemVer} — skipping`);
              }
            }
          }
        }

        // Collect atom names for symlink creation
        compAtomNames = Object.keys(atomicReqs.atom || {});
      }
    } else {
      // NEW: download skeleton from Gitea repo
      console.log(`Downloading component skeleton from Gitea repo...`);
      const skeleTmp = join(build, `__${compName}_skele_tmp`);
      await $`rm -rf ${skeleTmp}`;
      await mkdir(skeleTmp, { recursive: true });
      const skeleClone = join(build, `__skele_clone_tmp`);
      await $`rm -rf ${skeleClone}`;
      try {
        await gitClone(`vsrnd.synology.me:3000/skelethon/temp-component.git`, skeleClone);
        await $`cd ${skeleClone} && git archive HEAD | tar -x -C ${skeleTmp}`;
      } catch (err) {
        console.log(`  WARNING: Failed to clone skeleton repo: ${err.message}`);
      }
      await $`rm -rf ${skeleClone}`;

      // Ensure required skeleton files exist
      if (!(await exists(join(skeleTmp, "web.toml")))) {
        await writeFile(join(skeleTmp, "web.toml"), `[component]\nname = "${compName}"\n`);
      }
      if (!(await exists(join(skeleTmp, "rules", "rule.json")))) {
        await mkdir(join(skeleTmp, "rules"), { recursive: true });
        await writeFile(join(skeleTmp, "rules", "rule.json"), JSON.stringify({ chains: [] }, null, 2));
      }

      // Fix package.json placeholders
      const pkgPath = join(skeleTmp, "package.json");
      if (await exists(pkgPath)) {
        let pkg = JSON.parse(await readFile(pkgPath, "utf8"));
        pkg.name = compName;
        pkg.version = "unreleased";
        pkg.atomic = pkg.atomic || {};
        pkg.atomic.atom = {};
        pkg.atomic.molecule = {};
        pkg.atomic.organism = {};
        pkg.atomic.page = {};
        pkg.atomic.template = {};
        await writeFile(pkgPath, JSON.stringify(pkg, null, 2));
      }

      await $`rm -rf ${compDest}`;
      await mkdir(compDest, { recursive: true });
      await $`cp -r ${skeleTmp}/. ${compDest}/`;
      await $`rm -rf ${skeleTmp}`;
      console.log(`  Skeleton extracted to ${compDest}`);
    }

    // Create symlink for component
    const prjCompLink = join(devPrj, "components", compName);
    await mkdir(join(devPrj, "components"), { recursive: true });
    await $`ln -sfn /opt/share/components/${compName} ${prjCompLink}`;
    console.log(`Symlink: ${prjCompLink} -> /opt/share/components/${compName}`);

  // Create Project Skeleton
  console.log(`Creating project skeleton at ${devPrj}...`);
  for (const f of ["app.js", "License", "Changelog.md", "README.md"]) {
    const srcPath = join(fwTmp, f);
    if (await exists(srcPath)) { await $`cp ${srcPath} ${devPrj}/`; }
  }
  const gitignorePath = join(fwTmp, ".gitignore");
  if (await exists(gitignorePath)) { await $`cp ${gitignorePath} ${devPrj}/`; }
  await $`cp ${join(fwTmp, "coresetting.toml.example")} ${devPrj}/coresetting.toml`;

  // Copy engine + mandatory modules
  await mkdir(join(devPrj, "engine"), { recursive: true });
  await $`cp -r ${join(fwTmp, "engine", "compmgr")} ${join(devPrj, "engine", "compmgr")}`;
  await $`cp -r ${join(fwTmp, "engine", "workflow")} ${join(devPrj, "engine", "workflow")}`;
  await $`cp -r ${join(fwTmp, "engine", "sqlmanager")} ${join(devPrj, "engine", "sqlmanager")}`;
  await $`cp -r ${join(fwTmp, "engine", engine)} ${join(devPrj, "engine", engine)}`;

  // Copy atomic, utils, components
  await $`cp -r ${join(fwTmp, "atomic")} ${devPrj}/`;
  await $`cp -r ${join(fwTmp, "utils")} ${devPrj}/`;
  await $`cp -r ${join(fwTmp, "components")} ${devPrj}/`;

  // Replace atomic modules with symlinks to /opt/share/atomic/<type>/<name>/
  // Only for modules declared in component's package.json->atomic
  const atomicTypes = ["atom", "molecule", "organism", "template", "page"];
  for (const atomicType of atomicTypes) {
    const prjAtomicTypeDir = join(devPrj, "atomic", atomicType);
    const declaredNames = Object.keys(compPkg?.atomic?.[atomicType] || {});
    if (await exists(prjAtomicTypeDir) && declaredNames.length > 0) {
      for (const name of declaredNames) {
        const linkPath = join(devAtomic, atomicType, name);
        if (await exists(linkPath)) {
          await $`ln -sfn ${linkPath} ${join(prjAtomicTypeDir, name)}`;
        }
      }
    }
  }

  // Build Merged package.json
  const pkgPath = join(devPrj, "package.json");
  let pkg = {
    name: argv.project, productName: argv.project, homepage: "", version: "1.0.0",
    description: "", repository: "", main: "app.js", bin: "./app.js", author: "",
    license: "", private: true, dependencies: {}, devDependencies: {},
    scripts: { makeone: "bun install --linker hoisted", makeiso: "bun install --linker isolated" },
    workspaces: ["engine/*", "atomic/atom/*", "components/*", "utils/*"]
  };

  // Framework dependencies
  const rootPkg = JSON.parse(await readFile(join(fwTmp, "package.json"), "utf8"));
  pkg.framework = { [frameworkName]: selectedTag === "HEAD" ? rootPkg.version : selectedTag };
  if (rootPkg.dependencies) Object.assign(pkg.dependencies, rootPkg.dependencies);
  if (rootPkg.devDependencies) Object.assign(pkg.devDependencies, rootPkg.devDependencies);

  // Mandatory engine modules (compmgr + sqlmanager)
  for (const mod of ["compmgr", "sqlmanager"]) {
    const modPkgPath = join(fwTmp, "engine", mod, "package.json");
    if (await exists(modPkgPath)) {
      const modPkg = JSON.parse(await readFile(modPkgPath, "utf8"));
      if (modPkg.dependencies) Object.assign(pkg.dependencies, modPkg.dependencies);
      if (modPkg.devDependencies) Object.assign(pkg.devDependencies, modPkg.devDependencies);
    }
  }

  // Selected engine dependencies
  const enginePkgPath = join(fwTmp, "engine", engine, "package.json");
  if (await exists(enginePkgPath)) {
    const enginePkg = JSON.parse(await readFile(enginePkgPath, "utf8"));
    if (enginePkg.dependencies) Object.assign(pkg.dependencies, enginePkg.dependencies);
    if (enginePkg.devDependencies) Object.assign(pkg.devDependencies, enginePkg.devDependencies);
  }

  // ALL atomic module dependencies — from /opt/share/atomic/<type>/ (cloned from Gitea)
  for (const atomicType of atomicTypes) {
    const atomicTypeDir = join(devAtomic, atomicType);
    if (await exists(atomicTypeDir)) {
      for (const item of await readdir(atomicTypeDir)) {
        const itemPkgPath = join(atomicTypeDir, item, "package.json");
        if (await exists(itemPkgPath)) {
          const itemPkg = JSON.parse(await readFile(itemPkgPath, "utf8"));
          if (itemPkg.dependencies) Object.assign(pkg.dependencies, itemPkg.dependencies);
          if (itemPkg.devDependencies) Object.assign(pkg.devDependencies, itemPkg.devDependencies);
        }
      }
    }
  }

  // Component dependencies
  if (compMode) {
    Object.assign(pkg.dependencies, compPkgDeps.dependencies);
    Object.assign(pkg.devDependencies, compPkgDeps.devDependencies);
  }

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2));

  // Update coresetting.toml port
  const tomlPath = join(devPrj, "coresetting.toml");
  let tomlContent = await readFile(tomlPath, "utf8");
  tomlContent = tomlContent.replace(
    /portlistener = \d+/,
    `portlistener = ${engine === "webbunjs" ? 3000 : engine === "webnodehonojs" ? 3001 : 3002}`
  );
  await writeFile(tomlPath, tomlContent);

  await $`rm -rf ${fwTmp}`;

  // Auto-install
  console.log(`\nInstalling dependencies...`);
  await $`helper --proc=install --dir=${devPrj} --target=${devPrj}`;

  // Summary
  console.log(`\n=== Development tree set up ===`);
  console.log(`  Project:    ${devPrj}`);
  console.log(`  Framework:  ${devFramework} (${frameworkName})`);
  console.log(`  Atomic:     ${devAtomic} (atom, molecule, organism, template, page)`);
  console.log(`  Engine:     ${engine}`);
  if (compMode) {
    console.log(`  Component:  ${join(devComponents, compName)} (${compExists ? "existing repo" : "new skeleton"})`);
  }
  process.exit(0);
  break;

  case "kill":
  if (!argv.port) { console.log("Cannot get port number from argument --port!"); }
  else {
    const portoccupied = async () => {
      try { return (await $`lsof -i :${argv.port} -S | awk 'FNR == 2 {print $2}'`.text()).trim(); }
      catch (error) { return; }
    };
    let portnum = await portoccupied();
    if (!portnum) console.log(`"Port ${argv.port} available to use!"`);
    else {
      console.log(`"Port ${argv.port} occupied by other service, will start to free out now!"`);
      await $`${{ raw: `kill -9 ${portnum}` }}`;
      console.log(`"Port ${argv.port} available to use!"`);
    }
  }
  console.log(`Kill done!`);
  break;

  case "install":
  let lstpackage = await searchFiles(dir, "package.json");
  if (lstpackage.length > 0) {
    let pkg = { dependencies: {}, devDependencies: {}, name: basename(dir) };
    for (let value of lstpackage) {
      let rtn = JSON.parse(await readFile(value, "utf8"));
      if (rtn.dependencies) pkg.dependencies = { ...pkg.dependencies, ...rtn.dependencies };
      if (rtn.devDependencies) pkg.devDependencies = { ...pkg.devDependencies, ...rtn.devDependencies };
    }
    await writeFile(`${build}/package.json`, JSON.stringify(pkg));
    await $`${{ raw: "bun install --linker hoisted --no-save --no-lockfile" }}`.cwd(build);
    if (whoami != "") await $`${{ raw: `mkdir -p /nodepath${whoami}/${basename(dir)}` }}`;
    if (await exists(`/nodepath${whoami}/${basename(dir)}/node_modules`))
      await $`${{ raw: `rm -r /nodepath${whoami}/${basename(dir)}` }}`;
    await $`${{ raw: `cp -r node_modules /nodepath${whoami}/${basename(dir)}/node_modules` }}`.cwd(build);
  }
  if (target) {
    await $`${{ raw: `ln -sfn  /nodepath${whoami}/${basename(dir)}/node_modules ${target}/node_modules` }}`;
  }
  await $`${{ raw: "rm -r node_modules package.json" }}`.cwd(build);
  console.log("Install done!");
  break;

  default:
    console.log(`Unknown proc: ${proc || "(none)"}`);
    console.log(helpText);
  }
})();
