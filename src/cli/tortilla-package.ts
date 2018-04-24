#!/usr/bin/env node

import * as Program from "commander";
import { localStorage as LocalStorage } from "../local-storage";
import { Package } from "../package";

/**
 Package CLI.
 */

Program
  .command("update-deps")
  .description("Updates dependencies and auto-solves conflicts")
  .action((options) => {
    LocalStorage.assertTortilla(true);
    Package.updateDependencies();
  });

Program.parse(process.argv);
