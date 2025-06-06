const { scan, findConfigFiles, findConfigFile, scanFile, validateRule} = require('../index');
const path = require('path');
describe('FindConfigs', () => {
    test("should find multiple config files in the path", async () => {

        let configFile = await findConfigFiles('tests/configfiles/');
        expect(configFile).toBe(path.resolve('tests/configfiles/.namingrc.json'));

    });
});


describe('Naming Rules validation', () => {

    test("we should be able to do multiple exclusions and exclusion globs", () => {

        const config = {
            "scanRoot": path.resolve('tests/sample/'),
            "rules": [
                {
                    "type": "filename_postfix",
                    "excludes": "webroot/tests/**/Ignoreme.cfc,webroot/tests/**/Application.cfc",
                    "includes": "webroot/tests/**/*.cfc",
                    "value": "Test,Spec",
                    "severity": 3,
                    "message": "Unit tests should end with <SomeComponent>Test.cfc",
                    "href": "https://markdrew.io/noTests.html",
                    "name": "TestFile"
                }
            ]
        };
        let diagnostics = scanFile("tests/sample/webroot/tests/Application.cfc", config);
        // Positive test
        expect(diagnostics.length).toBe(0);

        diagnostics = scanFile("tests/sample/webroot/tests/Ignoreme.cfc", config);
        // Positive test
        expect(diagnostics.length).toBe(0);


        diagnostics = scanFile("tests/sample/webroot/tests/GoodTest.cfc", config);
        // Positive test
        expect(diagnostics.length).toBe(0);

        diagnostics = scanFile("tests/sample/webroot/tests/TestBad.cfc", config);
        // Positive test
        expect(diagnostics.length).toBe(1);



        // Name test
        expect(diagnostics[0].name).toBe("TestFile");




    });

    test('should get a parent config file', async () => {
        let configPath = await findConfigFile('tests/sample/folder1/folder2/folder3/test.txt');

        expect(configPath).toBe(path.resolve('tests/sample/.namingrc.json'));

        // Should stop if we send a root path
        let configPath2 = await findConfigFile('tests/sample/folder1/folder2/folder3/test.txt', 'tests/sample/folder1/folder2/');
        expect(configPath2).toBe(null);
    });

    test('should return the right positions for tags (scanfile)', () => {
        const diagnostics = scanFile("tests/sample/folder1/folder2/folder3/bad.cfm",
            {
                "scanRoot": path.resolve('tests/sample/folder1'),
                "rules": [
                    {
                        "type": "tag",
                        "includes": "**/*.cfm",
                        "value": "style",
                        "severity": 1,
                        "message": "CSS in cfm",
                        "href": "https://example.com/ourdocs.html"
                    }
                ]
            }
        );
        // console.log(JSON.stringify(diagnostics, null, 2));
        expect(diagnostics.length).toBe(1);
        expect(diagnostics[0].range.start.line).toBe(18);
        expect(diagnostics[0].range.start.column).toBe(1);
        expect(diagnostics[0].range.end.line).toBe(22);
        expect(diagnostics[0].range.end.column).toBe(9);
    });

    test('should return the right positions for functions (scanfile)', () => {
        const diagnostics = scanFile("tests/sample/folder1/folder2/folder3/bad.cfm",
            {
                "scanRoot": path.resolve('tests/sample/folder1'),
                "rules": [
                    {
                        "type": "function",
                        "includes": "**/*.cfm",
                        "value": "dump",
                        "severity": 1,
                        "message": "dump in cfm",
                        "href": "https://example.com/ourdocs.html"
                    }
                ]
            }
        );

        // console.log(JSON.stringify(diagnostics, null, 2));
        expect(diagnostics.length).toBe(1);
        expect(diagnostics[0].range.start.line).toBe(26);
        expect(diagnostics[0].range.start.column).toBe(2);
        expect(diagnostics[0].range.end.line).toBe(26);
        expect(diagnostics[0].range.end.column).toBe(20);
    });


    test('should trigger a rule for a matching glob and not trigger for ignored files', () => {
        const rule = {
            type: 'extension_not_allowed',
            includes: 'webroot/**/*.md',
            excludes: '**/readme.ignore.md',
            severity: 1,
            message: 'Markdown files not allowed under webroot.',
            href: "https://example.com/ourdocs.html",
            name: "MarkdownFiles"
        };

        // This file matches the include and does not match the ignore.
        let diagnostics = validateRule('webroot/readme.md', rule, {scanRoot: ''});

        expect(diagnostics.length).toBe(1);

        // This file matches the include but is explicitly ignored.
        diagnostics = validateRule('webroot/readme.ignore.md', rule, {scanRoot: ''});

        expect(diagnostics.length).toBe(0);
    });



    xtest('should trigger a rule for folder_not_allowed', () => {
        const rule = {
            type: 'folder_not_allowed',
            includes: 'webroot/**/tests/',
            severity: 1,
            message: 'Test folders are not allowed under the webroot.'
        };

        // This file matches the include and does not match the ignore.
        // This file matches the include but is explicitly ignored.
        diagnostics = validateRule('webroot/tests/', rule, {scanRoot: ''});
        expect(diagnostics.length).toBe(1);
        diagnostics = validateRule('webroot/nottest/', rule);
        expect(diagnostics.length).toBe(0);
        diagnostics = validateRule('webroot/nested/tests/', rule);
        expect(diagnostics.length).toBe(1);
    });
    xtest('should trigger a filename postfix', () => {
        const rule = {
            type: 'filename_postfix',
            includes: 'tests/**/*.cfc',
            excludes: 'tests/**/Application.cfc',
            value: "Test",
            severity: 1,
            message: 'Components under the test folder should be named {Something}Test.cfc',
            href: "https://example.com/ourdocs.html"
        };

        // This file matches the include and does not match the ignore.
        // This file matches the include but is explicitly ignored.
        diagnostics = validateRule('tests/nested/Thing.cfc', rule);
        expect(diagnostics.length).toBe(1);
        diagnostics = validateRule('tests/Thing.cfc', rule);
        expect(diagnostics.length).toBe(1);
        diagnostics = validateRule('tests/nested/ThingTest.cfc', rule);
        expect(diagnostics.length).toBe(0);
    });

});

xdescribe("Validate File Content/Text Rules", () => {

    // test("should find items within content with a file path", () => {
    //     const rule = {
    //         type: 'regex',
    //         include: '**/*.cfm',
    //         value: "<cfquery\b[^>]*>[\s\S]*?<\/cfquery>",
    //         severity: 1,
    //         message: 'CFM files should not have cfquery tags.',
    //         href: "https://example.com/ourdocs.html"
    //     };

    //     diagnose = validateFileRules(path.join('test_files', 'file2.cfm'), rule);
    //     expect(diagnose.length).toBe(1);

    // });
    test("should find items within content with string content", () => {

        // Need to see what JSON does to the regex string
        const rule = {
            type: 'regex',
            include: '**/*.cfm',
            value: /<cfquery\b[^>]*>[\s\S]*?<\/cfquery>/,
            severity: 1,
            message: 'CFM files should not have cfquery tags.',
            href: "https://example.com/ourdocs.html"
        };

        diagnose = validateContentRules('<cfquery>SELECT * FROM table</cfquery>', rule);

        expect(diagnose.length).toBe(1);

        const rule2 = {
            type: 'regex',
            include: '**/*.cfm',
            value: /cfdump/,
            severity: 1,
            message: 'CFM files should not have cfdump tags.',
            href: "https://example.com/ourdocs.html"
        };


        diagnose = validateContentRules('<cfdump var="elvis">', rule2);
        expect(diagnose.length).toBe(1);


        diagnose = validateContentRules('dump(elvis)', rule2);
        expect(diagnose.length).toBe(0);


    });

    test("should find items within content with a file path", () => {
        // Need to see what JSON does to the regex string
        const rule = {
            type: 'regex',
            include: '**/*.cfm',
            value: /<cfquery\b[^>]*>[\s\S]*?<\/cfquery>/,
            severity: 1,
            message: 'CFM files should not have cfquery tags.',
            href: "https://example.com/ourdocs.html"
        };

        diagnose = validateFileRules('test_files/file2.cfm', rule);

        expect(diagnose.length).toBe(1);

    });
    test("should find multiple items with the same rule in the same file", () => {
        // Need to see what JSON does to the regex string
        const rule = {
            type: 'regex',
            includes: '**/*.cfm',
            value: /<cfoutput[^>]*>((?!<\/cfoutput>)).*?<\/cfoutput>/,
            severity: 1,
            message: 'No output in CFM files.',
            href: "https://example.com/ourdocs.html",
            name: "NoOutputInCFM"
        };
        const diagnostics = scanFile("tests/sample/folder1/folder2/folder3/multimatch.cfm",
            {
                "scanRoot": path.resolve('tests/sample/folder1'),
                "rules": [
                    rule
                ]
            }
        );
        expect(diagnostics.length).toBe(6);
    });
    test("should be able to use regex with flags", async () => {
        const rule = {
            type: 'regex',
            includes: '**/*.cfm',
            value: /QUERYEXECUTE/,
            severity: 1,
            flags: "i"
        };
        const diagnostics = await scan("tests/sample/folder1/folder2/folder3/bad.cfm",
            {
                "scanRoot": path.resolve('tests/sample/folder1'),
                "rules": [
                    rule
                ]
            }
        );


        expect(diagnostics.length).toBe(2);

    });



});