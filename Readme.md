# Naming Rules

This project provides a command-line interface (CLI) for scanning files and directories to ensure they adhere to specified naming conventions. It helps identify naming rule violations based on configurable rules.

## Installation

### Global Installation (Recommended)

To install globally from npm:

```
npm install -g naming-rules
```

### Local Development

To install for local development, clone the repository and run:

```
npm install
```

## Usage

### Global Installation

After global installation, you can use the CLI directly:

```
naming-rules <path> [options]
```

### Local Development

For local development, you can use npm scripts:

```
npm run cli -- <path> [options]
```

### Options

- `-r, --reporter <reporter>`: Specify how to display the results. Options: `simple` (table format) or `json` (default: simple).
- `-s, --severity <severity>`: Choose which severity levels to display. Options: `1` (Error), `2` (Warning), `3` (Information), `4` (Hint), or `all` (default: all).
- `-c, --config <config>`: Provide the path to the configuration file (default: ./naming-rules.json).

### Examples

To scan a directory for naming rule violations:

```bash
# Using global installation
naming-rules ./path/to/scan

# Using local development
npm run cli -- ./path/to/scan

# With options
naming-rules ./path/to/scan --reporter json --severity 1 --config ./my-config.json
```

## Configuration

The project uses a configuration file to define the naming rules. By default, it looks for `./naming-rules.json` in the current directory, but you can specify a custom path using the `-c` option. The configuration file (typically named `.namingrc.json` or `naming-rules.json`) allows you to specify rules for file naming conventions, folder naming conventions, and content validation.


```json
{
    "rules": [
         {
            "type": "extension_not_allowed",
            "includes": "webroot/**/*.php",
            "severity": 1,
            "message": "Extension [*.php] Not allowed under webroot/ because PHP sucks",
            "href": "https://markdrew.io/docs/why_no_php_in_webroot.html"
        },
    ]
}
```

## Diagnostics

The CLI will output diagnostics in either a simple table format or as JSON, depending on the specified reporter option. Each diagnostic message includes details such as the severity, URI, and a description of the violation.



# Writing your own rules 

In the .namingrc.json file you can define your own rules. The rules are defined as an array of rule objects in JSON.

Each rule object needs the following properties:

- `type`: The type of rule. We support the following types:
    - `extension_not_allowed`: Disallow files with a specific extension. For example, disallowing `.php` files in the `webroot` folder.
    - `folder_not_allowed`: Disallow folders within the includes, for example, putting `tests` in the webroot folder.
    - `filename_postfix`: Require files with a specific postfix (or suffix). For example, all `js` files in the test folder should end with `test.js`. Requires a `value` property.
    - `regex`: Find content in files that matches the regex. Good for security checking, making sure passwords for example are not in code etc. Requires a `value` property and optionally a `flags` property.
    - `tag`: Find tags in the content of a file. For example make sure that we are not using the `marquee` tag in our code!
    - `function`: Find functions in the content of a file. For example make sure that we are not using the `eval` function in our code.

- `includes`: A glob pattern that defines the files or folders that the rule applies to. For example `webroot/**/*.php` would apply the rule to all PHP files under the webroot folder. These are based on the globbing library [minimatch](https://github.com/isaacs/minimatch).
- `severity`: The severity of the rule. These are:
    - `1` - Error
    - `2` - Warning
    - `3` - Information
    - `4` - Hint
- `message`: The message to display when the rule is violated

### Optional Properties

- `href`: A URL to a page that explains the rule in more detail
- `excludes`: A glob pattern that defines the files or folders that the rule does not apply to. For example `webroot/**/readme.md` would not match files if you have `includes` of `webroot/**/*.md` but you want to exclude `readme.md` files. These are based on the globbing library [minimatch](https://github.com/isaacs/minimatch).
- `value`: Required for `filename_postfix` and `regex` rule types. For `filename_postfix`, this is the required postfix/suffix. For `regex`, this is the regular expression pattern.
- `flags`: Optional for `regex` rule types. Specifies regex flags (e.g., "i" for case-insensitive matching).



## Example Rules

### Disallow Markdown Files in webroot

```
 {
    "type": "extension_not_allowed",
    "includes": "webroot/**/*.md",
    "severity": 1,
    "message": "Extension [*.md] Not allowed under webroot/ as it can show sensitive information.",
    "href": "https://example.com/docs/no-markdown-in-webroot.html"
},
```
This rule prevents markdown files (files ending with `.md`) from residing anywhere within the `webroot` directory. Markdown files in this location may unintentionally expose sensitive documentation or configuration details.

### Don't allow specific tags in certain files

```
{
    "type": "tag",
    "includes": "webroot/**/*.html",
    "severity": 1,
    "message": "The <marquee> tag is not allowed in webroot HTML files.",
    "href": "https://example.com/docs/no-marquee-tag.html"
}
```
This rule prevents the use of the `<marquee>` tag in HTML files within the `webroot` directory. The `<marquee>` tag is considered a deprecated and non-standard HTML element that should not be used in modern web development.


### Don't allow specific functions in certain files

```
{
    "type": "function",
    "includes": "webroot/**/*.js",
    "severity": 1,
    "message": "The eval() function is not allowed in webroot JavaScript files.",
    "href": "https://example.com/docs/no-eval-function.html"
}
```
This rule prevents the use of the `eval()` function in JavaScript files within the `webroot` directory. The `eval()` function is considered a security risk and should be avoided in modern web development.

### Don't allow folders in certain places

```
{
    "type": "folder_not_allowed",
    "includes": "webroot/**/tests",
    "severity": 1,
    "message": "Folder [tests] not allowed under [webroot/] as it can show sensitive information.",
    "href": "https://example.com/tests-in-webroot.html"
}
```

This rule checks for folders that should not be there, for example `tests` folders under the `webroot` folder. This is because tests can expose sensitive information about your application.

### Check for the postfix (or suffix) of test files
```
{
    "type": "filename_postfix",
    "excludes": "DataProvider.js",
    "includes": "unit_tests/**/*.js",
    "value": ".test",
    "severity": 3,
    "message": "Unit tests should end with <SomeComponent>.test.js",
    "href": "https://example.com/add-test-postfix.html"
}
```
The rule above looks for all files that are in the `unit_tests` folder and checks if they end with `.test`. So for example all javascript files like `somecomponent.js` but if it doesn't have `.test` at the end it will show an information message.

### Check for a regex in the content of a file
```
{
    "type": "regex",
    "includes": "webroot/**/*.js",
    "value": "(password|passwd|pwd|secret|api[-_]?key)\s*[=:]\s*["']([^"']{8,})["']",
    "flags": "i",
    "severity": 1,
    "message": "Do not add secrets or api passwords in your code",
    "href": "https://example.com/docs/no-secrets-in-code.html"
}
```

The `regex` type of rule allows you to put any regex in the `value` field and it will check the content of the file for that regex. You can also specify regex flags using the `flags` property (e.g., "i" for case-insensitive matching). This is useful for checking for security issues, for example, passwords in code.

Note: The above regex is just a simple example, you should use a more complex regex for your own code.


## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.
