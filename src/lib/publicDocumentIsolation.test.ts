// @vitest-environment node
import { readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

async function exportsOf(file: string) {
  const text = await readFile(path.join(process.cwd(), file), "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const values = new Map<string, string>();
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    if (
      !statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      )
    )
      continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer)
        values.set(
          declaration.name.text,
          declaration.initializer.getText(source)
        );
    }
  }
  return values;
}

test("public documents fail generation when server code reads request state", async () => {
  const layout = await exportsOf("src/app/(guest)/layout.tsx");
  expect(layout.get("dynamic")).toMatch(/^["']error["']$/);
  expect(layout.get("revalidate")).toBe("60");
  const event = await exportsOf("src/app/(guest)/event/[language]/page.tsx");
  expect(event.get("dynamicParams")).toBe("true");
});
