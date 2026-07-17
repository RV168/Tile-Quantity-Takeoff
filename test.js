import { readFileSync } from "fs";
import { resolve } from "path";

// Quick script to see if there is any obvious runtime error rendering App.tsx
// Using esbuild to transpile on the fly
const esbuild = require("esbuild");

console.log("Checking if App.tsx can be compiled and basic things...");
