process.stdout.write("locked\n");
process.stdin.resume();
process.stdin.once("end", () => process.exit(0));
process.stdin.once("close", () => process.exit(0));
