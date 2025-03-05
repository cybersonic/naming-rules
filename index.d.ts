export interface Range {
    start: {
        line: number;
        column: number;
    };
    end: {
        line: number;
        column: number;
    };
}

export class Diagnostic {
    uri: string;
    rule: any;
    type: string;
    message: string;
    severity: number;
    href: string;
    resource: string;
    range: Range;
    code: string;

    constructor(uri: string, rule: any, range?: Range);
    getRuleNickname(): string;
}

export function loadConfig(configPath: string): any;

export function findConfigFile(filePath: string, rootPath?: string): string | null;

export function validateRule(filePath: string, rule: any, config: any): Diagnostic[];

export function scanFolder(scanRoot: string, config?: any, diagnostics?: Diagnostic[]): Promise<Diagnostic[]>;

export function scanFile(filePath: string, config?: any, diagnostics?: Diagnostic[], rootPath?: string): Diagnostic[];

export function getTagRegex(tagName: string): RegExp;

export function scan(filePath: string, config: any): Promise<Diagnostic[]>;