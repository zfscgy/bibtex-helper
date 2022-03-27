// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { BibNodeProvider } from './bibtex_reader';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "bibtex-helper" is now active!');
	const bibTree = new BibNodeProvider();
	vscode.window.createTreeView('bibItemTree', {treeDataProvider: bibTree});
	vscode.commands.registerCommand('bibItemTree.refreshEntry',()=>bibTree.refresh());
	vscode.commands.registerCommand('bibItemTree.navigateTo', (item)=>bibTree.navigate(item));
	vscode.commands.registerCommand('bibItemTree.select', (item)=>{bibTree.navigate(item);bibTree.select(item);});
	vscode.commands.registerCommand('bibItemTree.copy', (item)=>{vscode.env.clipboard.writeText(item.label);})
}

// this method is called when your extension is deactivated
export function deactivate() {}
