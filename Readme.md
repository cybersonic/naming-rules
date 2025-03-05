# Naming Rules

This project provides a command-line interface (CLI) for scanning files and directories to ensure they adhere to specified naming conventions. It helps identify naming rule violations based on configurable rules.

## Installation

To install the project, clone the repository and run:

```
npm install
```

## Usage

After installation, you can use the CLI to scan a specific path. The basic command structure is as follows:

```
npm run cli -- <path> [options]
```

### Options

- `-r, --reporter <reporter>`: Specify how to display the results (default: simple).
- `-s, --severity <severity>`: Choose which severity levels to display (default: all).
- `-c, --config <config>`: Provide the path to the configuration file (default: ./naming-rules.json).

### Example

To scan a directory for naming rule violations, you can run:

```
npm run cli -- ./path/to/scan
```

## Configuration

The project uses a configuration file named `.namingrc.json` to define the naming rules. You can specify rules for file naming conventions, folder naming conventions, and more.


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

- `type`: The type of rule.  We support the following types:
    - `extension_not_allowed`: Disallow files with a specific extension.  For example, disallowing `.php` files in the `webroot` folder.
    - `folder_not_allowed`: Disallow folders within the inclddes, for example, putting `tests` in the webroot folder.
    - `filename_postfix`: Require files with a specific postfix (or suffix).  For example, all `js` files in the test folder should end with `test.js`.
    - `regex`: Find content in files that matches the regex. Good for security checking, making sure passwords for example are not in code etc. 
    - `tag`: Find tags in the content of a file. For example make sure that we are not using the `marquee` tag in our code!
    - `function`: Find functions in the content of a file. For example make sure that we are not using the `eval` function in our code.

- `includes`: A glob pattern that defines the files or folders that the rule applies to.  For example `webroot/**/*.php` would apply the rule to all PHP files under the webroot folder. These are based on the globbing library [minimatch](https://github.com/isaacs/minimatch).
- `severity`: The severity of the rule. These are:
    - `1` - Error
    - `2` - Warning
    - `3` - Information
    - `4` - Hint
- `message`: The message to display when the rule is violated

Optionally you can also include the following properties:

- `href`: A URL to a page that explains the rule in more detail
- `excludes`: A glob pattern that defines the files or folders that the rule does not apply to.  For example `webroot/**/readme.md` would not match files if you have `includes` of `webroot/**/*.md` but you want to exclude `readme.md` files. These are based on the globbing library [minimatch](https://github.com/isaacs/minimatch).



### Example Rules:
####  Disallow Markdown Files in webroot

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

#### Dont allow specifc tags in certian files

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


#### Dont allow specific functions in certian files

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

#### Dont allow folders in certian places

```
{
    "type": "folder_not_allowed",
    "includes": "webroot/**/tests",
    "severity": 1,
    "message": "Folder [tests] not allowed under [webroot/] as it can show sensitive information.",
    "href": "https:/example.com/tests-in-webroot.html"
}
```

This rule checks for folders that should not be there, for example `tests` folders under the `webroot` folder. This is because tests can expose sensitive information about your application.

#### Check for the postfix (or suffix) of test files
```
{
    "type": "filename_postfix",
    "excludes": "DataProvider.js",
    "includes": "unit_tests/**/*.js",
    "value": ".test",
    "severity": 3,
    "message": "Unit tests should end with <SomeComponent>.test.js",
    "href": "https:/example.com/add-test-postfix.html"
}
```
The rule above looks for all files that are in the `unit_tests` folder and checks if they end with `.test`. SO for example all javascript files like `somecomponent.js` but if it doesnt have `.test` at the end it will show an information message.

#### Check for a regex in the content of a file
```
{
    "type": "regex",
    "includes": "webroot/**/*.js",
    "value": "(?i)(password|passwd|pwd|secret|api[-_]?key)\s*[=:]\s*["']([^"']{8,})["']",
    "severity": 1,
    "message": "Do not add secrets or api passwords int your code",
    "href": "https://example.com/docs/no-secrets-in-code.html"
}
```

The `regex` type of rule allows you to put any regex in the `value` field and it will check the content of the file for that regex. This is useful for checking for security issues, for example, passwords in code.
Node: The above regex is just  simple example, you should use a more complex regex for your own code.


## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.
