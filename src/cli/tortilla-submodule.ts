#!/usr/bin/env node

import * as Program from "commander";
import { localStorage as LocalStorage } from "../local-storage";
import { Submodule } from "../submodule";

/**
 Submodule CLI.
 */

Program
  .command("add <remotes...>")
  .description("Add submodules to the root commit")
  .action((remotes) => {
    LocalStorage.assertTortilla(true);
    Submodule.add(remotes);
  });

Program
  .command("remove [submodules...]")
  .description("Remove submodules from the root commit")
  .action((submodules) => {
    LocalStorage.assertTortilla(true);
    Submodule.remove(submodules);
  });

Program
  .command("update [submodules...]")
  .description("Update submodules in root commit")
  .action((submodules) => {
    LocalStorage.assertTortilla(true);
    Submodule.update(submodules);
  });

Program
  .command("reset [submodules...]")
  .description("Reset submodules in root commit")
  .action((submodules) => {
    LocalStorage.assertTortilla(true);
    Submodule.reset(submodules);
  });

Program.parse(process.argv);
