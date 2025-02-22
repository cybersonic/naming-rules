Naming Convention 

# vscode-naming-conventions

The Naming Conventions analyser allows you to define naming conventions for your project and then check if the names of your files and folders are compliant with the defined conventions.

It looks for both files and folders in the workspace and checks if the names are compliant with the defined conventions defined in the `.namingrc.json` file.  It also provides JSON schema support for the `.namingrc.json` file.

Rules defined in the `.namingrc.json` are in JSON format and can be defined as follows:

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
## Features

- Define naming conventions for your project
- Save the rules in a proect specific `.namingrc.json` file
- Check if the names of your files and folders are compliant with the defined conventions
- JSON schema support for the `.namingrc.json` file

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

- `includes`: A glob pattern that defines the files or folders that the rule applies to.  For example `webroot/**/*.php` would apply the rule to all PHP files under the webroot folder.
- `severity`: The severity of the rule. These are:
    - `1` - Error
    - `2` - Warning
    - `3` - Information
    - `4` - Hint
- `message`: The message to display when the rule is violated

Optionally you can also include the following properties:

- `href`: A URL to a page that explains the rule in more detail
- `excludes`: A glob pattern that defines the files or folders that the rule does not apply to.  For example `webroot/**/readme.md` would not match files if you have `includes` of `webroot/**/*.md` but you want to exclude `readme.md` files.


# Runing the cli
TBD
# Using in your own code
TBD