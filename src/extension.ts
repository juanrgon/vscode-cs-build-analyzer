import * as vscode from "vscode";
import * as xml2js from "xml2js";
import * as fs from "fs";
import * as path from "path";

class XmlPropertyCodeLensProvider implements vscode.CodeLensProvider {
  private async parseXmlFile(filePath: string) {
    const parser = new xml2js.Parser();
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    const xmlData = await parser.parseStringPromise(fileContent);
    return xmlData.Project.PropertyGroup[0];
  }

  private async findDirectoryBuildProps(document: vscode.TextDocument): Promise<string | null> {
    let currentDir = path.dirname(document.uri.fsPath);
    while (currentDir !== path.dirname(currentDir)) {
      const buildPropsPath = path.join(currentDir, "Directory.Build.props");
      if (fs.existsSync(buildPropsPath)) {
        return buildPropsPath;
      }
      currentDir = path.dirname(currentDir);
    }
    return null;
  }

  async provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    try {
      const csprojProperties = await this.parseXmlFile(document.uri.fsPath);
      const buildPropsPath = await this.findDirectoryBuildProps(document);
      let buildPropsProperties: any = {};

      if (buildPropsPath) {
        buildPropsProperties = await this.parseXmlFile(buildPropsPath);
      }

      for (const property in buildPropsProperties) {
        if (csprojProperties.hasOwnProperty(property)) {
          continue;
        }

        const line = document.getText().indexOf(`<${property}>`);
        if (line !== -1) {
          const range = document.lineAt(document.positionAt(line).line).range;
          codeLenses.push(
            new vscode.CodeLens(range, {
              title: `${property}: ${buildPropsProperties[property][0]} (from Directory.Build.props)`,
              command: "",
            })
          );
        }
      }

      for (const property in csprojProperties) {
        if (csprojProperties.hasOwnProperty(property)) {
          const line = document.getText().indexOf(`<${property}>`);
          if (line !== -1) {
            const range = document.lineAt(document.positionAt(line).line).range;
            codeLenses.push(
              new vscode.CodeLens(range, {
                title: `${property}: ${csprojProperties[property][0]}`,
                command: "",
              })
            );
          }
        }
      }
    } catch (error) {
      console.error("Error parsing XML: ", error);
    }

    return codeLenses;
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { language: "xml", scheme: "file", pattern: "**/*.csproj" },
      new XmlPropertyCodeLensProvider()
    )
  );
}

export function deactivate() {}
