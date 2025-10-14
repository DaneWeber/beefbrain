#! /usr/bin/env node

const { Command } = require("commander");

console.log("Beefs And Brains")

const program = new Command();

program
  .version("0.0.1")
  .description("Beefs And Brains")
  .option("-c, --calc", "Recalculate values in file")
  .parse(process.argv);

const options = program.opts();
