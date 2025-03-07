const ts = require("typescript");
const fs = require("fs");
const path = require("path");

// 配置 TypeScript 编译器选项
const config = {
  compilerOptions: {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    outDir: "./dist",
    rootDir: "./src",
    strict: true,
    esModuleInterop: true,
  },
  include: ["./src/**/*"],
};

// 读取 tsconfig.json 或使用配置对象
const parsedCommandLine = ts.parseJsonConfigFileContent(config, ts.sys, "./");
const program = ts.createProgram(
  parsedCommandLine.fileNames,
  parsedCommandLine.options
);

// 编译程序并生成诊断信息
const emitResult = program.emit();

const allDiagnostics = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics);

allDiagnostics.forEach((diagnostic: any) => {
  if (diagnostic.file) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start!
    );
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      "\n"
    );
    console.error(
      `Error ${diagnostic.file.fileName} (${line + 1},${
        character + 1
      }): ${message}`
    );
  } else {
    console.error(
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    );
  }
});

const exitCode = emitResult.emitSkipped ? 1 : 0;
process.exit(exitCode);
