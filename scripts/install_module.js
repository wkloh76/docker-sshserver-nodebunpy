/**
 * Copyright (c) 2025   Loh Wah Kiang
 *
 * openGauss is licensed under Mulan PSL v2.
 * You can use this software according to the terms and conditions of the Mulan PSL v2.
 * You may obtain a copy of Mulan PSL v2 at:
 *
 *          http://license.coscl.org.cn/MulanPSL2
 *
 * THIS SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, WITHOUT WARRANTIES OF ANY KIND,
 * EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO NON-INFRINGEMENT,
 * MERCHANTABILITY OR FIT FOR A PARTICULAR PURPOSE.
 * See the Mulan PSL v2 for more details.
 * -------------------------------------------------------------------------
 */

const { $ } = require("bun");
const { join, basename } = require("path");
const { exists, readdir, readFile, writeFile } = require("fs/promises");

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

(async () => {
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
  switch (proc) {
    case "kill":
      if (!argv.port) {
        console.log("Cannot get port number from argument --port!");
      } else {
        const portoccupied = async () => {
          try {
            return (
              await $`lsof -i :${argv.port} -S | awk 'FNR == 2 {print $2}'`.text()
            ).trim();
          } catch (error) {
            return;
          }
        };

        let portnum = await portoccupied();
        if (!portnum) console.log(`"Port ${argv.port} available to use!"`);
        else {
          console.log(
            `"Port ${argv.port} occupied by other service, will start to free out now!`
          );
          await $`${{ raw: `kill -9 ${portnum}` }}`;
          console.log(`"Port ${argv.port} available to use!"`);
        }
      }
      console.log(`Kill done!`);
      break;

    case "install":
      let lstpackage = await searchFiles(dir, "package.json");
      if (lstpackage.length > 0) {
        let package = {
          dependencies: {},
          devDependencies: {},
          name: basename(dir),
        };

        for (let value of lstpackage) {
          let rtn = JSON.parse(await readFile(value, "utf8"));
          if (rtn.dependencies)
            package.dependencies = {
              ...package.dependencies,
              ...rtn.dependencies,
            };
          if (rtn.devDependencies)
            package.devDependencies = {
              ...package.devDependencies,
              ...rtn.devDependencies,
            };
        }
        await writeFile(`${build}/package.json`, JSON.stringify(package));
        await $`${{ raw: "bun install --no-save --no-lockfile" }}`.cwd(build);
        if (whoami != "")
          await $`${{ raw: `mkdir -p /nodepath${whoami}/${basename(dir)}` }}`;
        if (await exists(`/nodepath${whoami}/${basename(dir)}/node_modules`))
          await $`${{ raw: `rm -r /nodepath${whoami}/${basename(dir)}` }}`;
        await $`${{
          raw: `cp -r node_modules /nodepath${whoami}/${basename(
            dir
          )}/node_modules`,
        }}`.cwd(build);
      }

      if (target) {
        await $`${{
          raw: `ln -sfn  /nodepath${whoami}/${basename(
            dir
          )}/node_modules ${target}/node_modules`,
        }}`;
      }
      await $`${{ raw: "rm -r node_modules package.json" }}`.cwd(build);
      console.log("Install done!");
      break;
    default:
      console.log("--proc undefined!");
  }
})();
