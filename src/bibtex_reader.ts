import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { listenerCount } from 'process';
import { runInThisContext } from 'vm';


export class BibItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly paper_name: string = "",
        public level: number = 0,
        public line_start: number = 0,
        public line_end: number = 0,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = paper_name;
        this.description = paper_name;
        this.level = level;
        this.line_start = line_start;
        this.line_end = line_end;

        this.command = {
            command: "bibItemTree.navigateTo",
            title: "Navigate BibItem",
            arguments: [this]
        }
        if (level != 99) this.contextValue = "header";
        else this.contextValue = 'bibItem';
    }
}


export class BibNodeProvider implements vscode.TreeDataProvider<BibItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<BibItem | undefined | void> = new vscode.EventEmitter<BibItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<BibItem | undefined | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: BibItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: BibItem): Thenable<BibItem[]> {
		if (!vscode.window.activeTextEditor) {
			return Promise.resolve([]);
		}
		return Promise.resolve(this.getBibItems(element));
	}

    public navigate(bibItem: BibItem) {
        vscode.commands.executeCommand("revealLine", {"lineNumber": bibItem.line_start, "at": "top"});
    }

    public select(bibItem: BibItem) {
        if (vscode.window.activeTextEditor) {
            let bib_range = new vscode.Range(bibItem.line_start, 0, bibItem.line_end, 0);
            vscode.window.activeTextEditor.selection = new vscode.Selection(bib_range.start, bib_range.end);
        }
    }

    private getBibItems(item?: BibItem): BibItem[] {
        let count_leading_char = function(line: string,  char: string): number {
            let count = 0;
            for (; count < line.length && line[count] == char; count++);
            return count;
        }
        let count_char = function(line: string,  char: string): number {
            let count = 0;
            for (var i = 0; i < line.length; i++) {
                if (line[i] == char) count += 1;
            }
            return count;
        }
        let extract_parentheses = function(s: string, left: string = "{", right: string = "}"): string {
            let left_count = 0;
            let right_count = 0;
            let i = 0;
            while (i < s.length) {
                if (left_count > 0 && left_count == right_count) return s.substring(0, i);

                if (s[i] == left) left_count += 1;
                else if (s[i] == right) right_count += 1;
                i += 1
            }
            return s;
        }


        console.log(item);
        let line_offset: number = 0;
        let level = 0;
        if (item) {
            if (item.level == 99) {
                return [];
            }
            else {
                level = item.level;
                line_offset = item.line_start + 1;
            }
        }
        let text: string = vscode.window.activeTextEditor?.document.getText() || "";
        let lines = text.split("\n");
        if (line_offset == lines.length) return [];
        let next_level_head = "#".repeat(level + 1);
        let bibItems = [];
        let i = line_offset;
        while(i < lines.length) {
            let line = lines[i];
            console.log("Current line", i, line);
            // Sub-header is met
            if (line.startsWith(next_level_head)) {
                let actual_level = count_leading_char(line, "#");
                let line_start = i;
                let header = line.substring(count_leading_char(line, "#")).trim();
                line = "";  // Insert a virtual line for convinience
                // end with #= or find a equal or higher level label, then stop
                while (!line.startsWith("#") || (line.startsWith("#") && count_leading_char(line, "#") > actual_level)) {
                    i += 1
                    if (i == lines.length) break;
                    line = lines[i]
                }
                bibItems.push(new BibItem(
                    header, "header", actual_level, line_start, i, vscode.TreeItemCollapsibleState.Expanded
                ));
            }
            else if (line.startsWith("@")) {
                let matches = line.match(/{.*,/g);
                if (matches == null) {
                    i += 1;
                    if (i == lines.length) break;
                    continue;
                }
                let label = matches[0];
                label = label.substring(1, label.length - 1);
                let bib_start_line = i;
                let n_left_brackets = 0;
                let n_right_bracket = 0;
                n_left_brackets = count_char(line, "{");
                n_right_bracket = count_char(line, "}");
                while (n_left_brackets > n_right_bracket) {
                    i += 1;
                    if (i == lines.length) return bibItems;
                    line = lines[i];
                    n_left_brackets += count_char(line, "{");
                    n_right_bracket += count_char(line, "}");
                }
                let bib_end_line = i;
                let total_bibtext = lines.slice(bib_start_line, bib_end_line).join("");
                let title_matches = total_bibtext.match(/(?!book)title[\t\s]*=[\t\s]*{*.*}/gs);
                let title = "";
                if (title_matches != null) {
                    title = title_matches[0];
                    title = extract_parentheses(title);
                    title_matches = title.match(/{.*}/gs);
                    if (title_matches != null) {
                        title = title_matches[0];
                        title = title.substring(1, title.length - 1);
                        title = title.replace(/[\s\t\n]+/g, " ").trim();
                        bibItems.push(new BibItem(
                            label, title, 99, bib_start_line, bib_end_line + 1, vscode.TreeItemCollapsibleState.None
                        ));
                    }
                }
                i += 1;
                if (i == lines.length) return bibItems;
            }
            // if met a higher-level label, then quit.
            else if (line.startsWith("#") && count_leading_char(line, "#") <= level + 1) break;
            else {
                i += 1;
                if (i == lines.length) break;
            }
        }
        console.log("Finished", item);
        return bibItems;

    }

}
