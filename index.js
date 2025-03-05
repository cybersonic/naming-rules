const { existsSync, fstat, fstatSync, readdir, readdirSync, readFileSync, statSync } = require('fs');
const { resolve, join, relative, dirname, basename, extname } = require('path');
const { minimatch } = require('minimatch');
const configFileName = ".namingrc.json";
const ignoreFolders = ["node_modules", ".git"];

// A Diagnostic object
class Diagnostic {
    uri;
    rule;
    type;
    message;
    severity;
    href;
    resource;
    range;
    code;

    constructor(uri, rule, range) {
        this.uri = uri;
        this.rule = rule;
        this.type = rule.type;
        this.message = rule.message;
        this.severity = rule.severity;
        this.href = rule.href;
        this.resource = "file"; //file or folder
        this.range = range || {
            start: { line: 0, column: 0 },
            end: { line: 0, column: 0 }
        };
        this.code = "";
        this.name = "";

    }

    getRuleNickname() {

        if (this.rule.name && this.rule.name.length > 0) {
            return this.rule.name;
        }
        if (this.rule.type === "function" || this.rule.type === "tag" || this.rule.type === "filename_postfix") {
            return this.rule.type + " " + this.rule.value;
        }
        return this.rule.type;
    }
}

/**
 * Scans a folder or a directory. If it is a folder it looks for the config files from the root down, if it is a file it looks from the file up. 
 * It then scans the files and folders for the rules.
 * @param {string} scanRoot - The path to the folder or file to scan.
 * @param {Object} config - The naming convention config. (optional)
 * @param {Array<Diagnostic>} diagnostics - An array of diagnostic messages. (optional)
 */
async function scan(scanRoot, config = {}) {
    console.log("I am doing a scaaaaaaan");
    scanRoot = resolve(scanRoot);
    const diagnostics = [];
    // Check the scanroot is a folder or file 
    if (!existsSync(scanRoot)) {
        console.error(`File or folder not found: ${scanRoot}`);
        return diagnostics;
    }
    let fileConfig;
    let configJSON = {};

    if (statSync(scanRoot).isFile()) {
        fileConfig = findConfigFile(scanRoot);
        configJSON = JSON.parse(readFileSync(fileConfig, 'utf8'));
        configJSON["scanRoot"] = dirname(scanRoot);
        return await scanFile(scanRoot, configJSON, diagnostics);
    }

    fileConfig = await findConfigFiles(scanRoot);
    configJSON = JSON.parse(readFileSync(fileConfig, 'utf8'));
    configJSON["scanRoot"] = scanRoot;
    return await scanFolder(scanRoot, configJSON, diagnostics);
    return diagnostics;
}
/**
 * Scans a folder and validates it against the rules in the config. 
 * returns an array of diagnostics. 
 * @param {string} scanRoot 
 * @param {Object} config 
 * @param {Array<Diagnostic>} diagnostics 
 * @returns 
 */
async function scanFolder(scanRoot, config = {}, diagnostics = []
) {
    const files = readdirSync(scanRoot);
    // See if there is a config file in the root.
    const configPath = join(scanRoot, configFileName);
    if (existsSync(configPath)) {
        config = JSON.parse(readFileSync(configPath, 'utf8'));
        config["scanRoot"] = scanRoot;
        // console.log("Found config!", configPath);
    }

    for (const file of files) {
        const filePath = join(scanRoot, file);
        let diagnostic;
        if (statSync(filePath).isDirectory() && !ignoreFolders.includes(file)) {

            // Check the rules against the folder.
            processRules(filePath, config, diagnostics);
            // Now do the children
            scanFolder(filePath, config, diagnostics);
            // diagnostics = diagnostics.concat(diagnostic);
        } else {
            // const relativePath = path.relative(scanRoot, filePath);
            // console.log("Processing file", relativePath, "against scanRoot", scanRoot);
            processRules(filePath, config, diagnostics);
            // diagnostics = diagnostics.concat(diagnostic);
        }
    }
    return diagnostics;
}

/**
 * Recursively searches for configuration files starting from the given file path.
 *
 * This asynchronous function traverses directories beginning at the provided filePath. It
 * constructs the resolved path, checks for the existence of a designated configuration file,
 * and if found, adds its relative path (from the rootPath) to the foundconfigs array. In the
 * absence of the configuration file at the current level, it traverses child folders (excluding
 * any folders specified in ignoreFolders), recursively looking for configuration files.
 *
 * @async
 * @param {string} filePath - The file or directory path to begin the search.
 * @param {string} [rootPath=""] - The root directory path used for computing relative paths.
 *   Defaults to the first resolved path when not supplied.
 * @param {Array<string>} [foundconfigs=[]] - An array accumulating relative paths of found configuration files.
 * @returns {Promise<Array<string>>} A promise that resolves to an array containing the relative paths of configuration files found.
 */
async function findConfigFiles(filePath, rootPath = "", foundconfigs = []) {

    const resolvedPath = resolve(filePath);
    if (!rootPath) {
        rootPath = resolvedPath;
    }

    const potentialConfigPath = join(rootPath, configFileName);

    if (existsSync(potentialConfigPath)) {
        // const relativePath = relative(rootPath, potentialConfigPath);
        // foundconfigs.push(relativePath);
        // console.log({ foundconfigs });
        // // TODO: Early exit. IF we found it we done. We can worry about subfolders later.
        return potentialConfigPath;
    }
    // Now go into child folders:
    const childFolders = await readdirSync(resolvedPath).filter((file) => {
        if (statSync(join(resolvedPath, file)).isDirectory()) {
            return !ignoreFolders.includes(file);
        }
        return false;
    });



    for (const folder of childFolders) {
        const childPath = join(resolvedPath, folder);
        await findConfigFiles(childPath, rootPath, foundconfigs);
    }
    return foundconfigs;
}



/**
 * Scans an individial file path. We also can search for the config file all the way up the tree. until we hit the root path. 
 * @param {string} filePath - The path of the file to scan.
 * @param {Object} config - The naming convention config. (optional)
 * @param {Array<Object>} diagnostics - An array of diagnostic messages. (optional)
 * @param {string} rootPath - The root path of the scan. (optional)
 **/
function scanFile(filePath, config, diagnostics = [], rootPath) {
    processRules(filePath, config, diagnostics);
    return diagnostics;
}

/**
 * Looks for the config file from the current path up to the root path.
 *
 * @param {string} filePath - The starting path from where to search for the configuration file. Can be a file or directory.
 * @param {string} [rootPath="/"] - The root directory to limit the upward search. The search stops when this root is reached.
 * @returns {string|null} The absolute path to the configuration file if found; otherwise, null.
 * @throws {Error} Throws an error if the initial file path does not exist.
 */
function findConfigFile(filePath, rootPath = "/") {
    if (resolve(filePath) === resolve(rootPath)) {
        return null;
    }

    const resolvedPath = resolve(filePath);
    const root = resolve(rootPath) || "/";

    let nearestConfigPath = join(resolvedPath, configFileName);
    if (statSync(resolvedPath).isFile()) {
        nearestConfigPath = join(dirname(resolvedPath), configFileName);
    }

    if (existsSync(nearestConfigPath)) {
        return nearestConfigPath;
    }

    const parent = resolve(dirname(nearestConfigPath), "..");

    return findConfigFile(parent, rootPath);
}

function processRules(filePath, config, diagnostics) {
    const rules = config.rules || [];
    // TODO: rather than loop , do them all at once.
    // console.log("File Rules", fileRules.length);
    for (const rule of rules) {
        const ruleResults = validateRule(filePath, rule, config);

        for (let ruleResult of ruleResults) {
            diagnostics.push(ruleResult);
        }
        // diagnostics = diagnostics.concat(ruleResults);
    }
    return diagnostics;
}



function validateRule(filePath, rule, config) {
    const diagnostics = [];

    // Get relative path  so we can use minmatch
    const relativePath = relative(config.scanRoot, filePath);

    // Normalize file paths to use forward slashes.
    const normalizedFilePath = relativePath.replace(/\\/g, '/');

    if (!rule.includes) {
        console.error('Rule must have a Glob pattern in the `includes` field', rule);
        throw new Error('Rule must have a Glob pattern in the `includes` field');
    }
    if (rule.includes) {
        // Should mwatch at least one of the includes. 
        if (!minimatch(normalizedFilePath, rule.includes)) {
            return diagnostics; // file doesn't match the include pattern, so ignore.
        }
    }


    // Next, check if the file matches an ignore pattern.
    // split the rules.excludes by comma, and then check each one.
    if (rule.excludes) {
        const excludes = rule.excludes.split(',').map(e => e.trim());

        for (const exclude of excludes) {
            if (minimatch(normalizedFilePath, exclude)) {
                return diagnostics; // file matches the ignore pattern, so skip this rule.
            }
        }
    }
    // try {
    //     console.info(normalizedFilePath, rule.include, minimatch(normalizedFilePath, rule.include))
    // }
    // catch (e) {
    //     console.error(e, rule);
    //     throw e;
    // }
    // Process rule types.
    let diag = new Diagnostic(filePath, rule);

    if (rule.name && rule.name.length > 0) {
        diag.name = rule.name;
    }


    switch (rule.type) {
        case 'extension_not_allowed': {
            // Here, rule.value could be a glob pattern like "*.md"
            if (minimatch(normalizedFilePath, rule.includes)) {

                diagnostics.push(
                    diag
                );

            }

            break;
        }
        case 'folder_not_allowed': {
            // For folder not allowed, we split the path and check if any segment equals the forbidden folder.
            if (minimatch(normalizedFilePath, rule.includes)) {

                diag.resource = "folder";
                diagnostics.push(diag);
            }
            break;
        }
        case 'filename_postfix': {
            const fileName = basename(filePath);
            const ext = extname(fileName);
            const baseName = basename(fileName, ext);

            if (!baseName.endsWith(rule.value)) {
                diagnostics.push(
                    diag
                );
            }
            break;
        }
        case 'regex': {
            const regex = new RegExp(rule.value, 'gi');
            const content = readFileSync(filePath, 'utf8');
            multiRegExMatch(regex, content, filePath, rule, diagnostics);

            // if (match) {
            //     const startIndex = match.index;
            //     const endIndex = startIndex + match[0].length;
            //     const startPos = getLineColumn(content, startIndex);
            //     const endPos = getLineColumn(content, endIndex);

            //     const code = match[0];
            //     diag.range = { start: startPos, end: endPos };
            //     diag.code = match[0];
            //     diagnostics.push(diag);
            // }
            break;
        }
        case 'tag': {
            const content = readFileSync(filePath, 'utf8');
            const tagRegex = getTagRegex(rule.value);
            multiRegExMatch(tagRegex, content, filePath, rule, diagnostics);
            // const match = tagRegex.exec(content);
            // if (match) {
            //     const startIndex = match.index;
            //     const endIndex = startIndex + match[0].length;
            //     const startPos = getLineColumn(content, startIndex);
            //     const endPos = getLineColumn(content, endIndex);

            //     diag.range = { start: startPos, end: endPos };

            //     diag.code = match[0];
            //     diagnostics.push(diag);
            // }
            break;
        }
        // case 'function_def': {
        //     const content = fs.readFileSync(filePath, 'utf8');
        //     const regex = new RegExp(`function\\s+${rule.value}\\s*\\(`);
        //     const match = regex.exec(content);
        //     if (match) {
        //         const startIndex = match.index;
        //         const endIndex = startIndex + match[0].length;
        //         const startPos = getLineColumn(content, startIndex);
        //         const endPos = getLineColumn(content, endIndex);
        //         diagnostics.push(new Diagnostic(filePath, rule, { start: startPos, end: endPos }));
        //     }
        //     break
        // }
        case 'function': {
            const content = readFileSync(filePath, 'utf8');
            const regex = getFunctionRegex(rule.value);
            multiRegExMatch(regex, content, filePath, rule, diagnostics);
            // const match = regex.exec(content);
            // if (match) {
            //     const startIndex = match.index;
            //     const endIndex = startIndex + match[0].length;
            //     const startPos = getLineColumn(content, startIndex);
            //     const endPos = getLineColumn(content, endIndex);

            //     diag.range = { start: startPos, end: endPos };
            //     diag.code = match[0];
            //     diagnostics.push(diag);
            // }
            break
        }
        default:
            break;
    }

    // console.log(diagnostics);
    return diagnostics;
}



function multiRegExMatch(regex, content, filePath, rule, diagnostics) {
    let match;
    while ((match = regex.exec(content)) !== null) {
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;
        const startPos = getLineColumn(content, startIndex);
        const endPos = getLineColumn(content, endIndex);
        let multidiag = new Diagnostic(filePath, rule);

        if (rule.name && rule.name.length > 0) {
            multidiag.name = rule.name;
        }
        multidiag.range = { start: startPos, end: endPos };
        multidiag.code = match[0];

        diagnostics.push(multidiag);
    }
}

function getTagRegex(tagName) {
    return new RegExp(
        `<${tagName}\\b([^>]*)>([\\s\\S]*?)?<\\/${tagName}>|<${tagName}\\b([^>]*)>`,
        "gi"
    );
}

function getFunctionRegex(functionName) {
    return new RegExp(
        `(${functionName}\w*)\s*\(([^)]*)\)`,
        "gi"
    );
}



function getLineColumn(content, index) {
    const lines = content.substring(0, index).split(/\r?\n/);
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1
    };
}

module.exports = {
    findConfigFiles,
    findConfigFile,
    scanFile,
    scanFolder,
    scan
}