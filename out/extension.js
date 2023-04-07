"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const xml2js = require("xml2js");
const fs = require("fs");
const path = require("path");
class XmlPropertyCodeLensProvider {
    async parseXmlFile(filePath) {
        const parser = new xml2js.Parser();
        const fileContent = await fs.promises.readFile(filePath, "utf-8");
        const xmlData = await parser.parseStringPromise(fileContent);
        return xmlData.Project.PropertyGroup[0];
    }
    async findDirectoryBuildProps(document) {
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
    async provideCodeLenses(document, token) {
        const codeLenses = [];
        try {
            const csprojProperties = await this.parseXmlFile(document.uri.fsPath);
            const buildPropsPath = await this.findDirectoryBuildProps(document);
            let buildPropsProperties = {};
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
                    codeLenses.push(new vscode.CodeLens(range, {
                        title: `${property}: ${buildPropsProperties[property][0]} (from Directory.Build.props)`,
                        command: "",
                    }));
                }
            }
            for (const property in csprojProperties) {
                if (csprojProperties.hasOwnProperty(property)) {
                    const line = document.getText().indexOf(`<${property}>`);
                    if (line !== -1) {
                        const range = document.lineAt(document.positionAt(line).line).range;
                        codeLenses.push(new vscode.CodeLens(range, {
                            title: `${property}: ${csprojProperties[property][0]}`,
                            command: "",
                        }));
                    }
                }
            }
        }
        catch (error) {
            console.error("Error parsing XML: ", error);
        }
        return codeLenses;
    }
}
function activate(context) {
    context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: "xml", scheme: "file", pattern: "**/*.csproj" }, new XmlPropertyCodeLensProvider()));
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map