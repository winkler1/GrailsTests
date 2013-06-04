/*
 GrailsTests.js, by Jeff Winkler


 Instructions:
 -------------
 Install NodeJS: http://nodejs.org/download/

 Open a Terminal in the portal dir. Type:
 npm install growl lodash nodewatch
 "node GrailsTests.js".

 To MANUALLY DECLARE a test to be run:
 - go into the class Foo.groovy:
 - Add a line such as the following:

 // RunTest integration/SummaryMetricsServiceIntegrationTests
 // RunTest unit/FaceFinderServiceTests

 Now, whenever Foo.groovy changes, these tests will run.

 */

// if you get "Cannot find module 'nodewatch'", npm install nodewatch
// if you get "Cannot find module 'growl'", npm install growl.
// if you get "Cannot find module 'lodash'", npm install lodash.

/*
 Growl:
 Works with IntelliJ: On OSX, I have seen file change detection fail. Not a problem here.
 Opens test results: If tests fail, the index.html will be opened.
 Always watching: Even if a file is changed while tests are running, the test will be queued up for running later.
 Use optimized command line: If a single unit test needs to be run, integration tests will not be run at all.
 Small memory footprint: the node process takes a mere 21MB of memory.
 */

var exec = require('child_process').exec;
var fs = require('fs');
var growl = require('growl');
var lodash = require('lodash');
var util = require('util');
var watch = require('nodewatch'); // https://npmjs.org/package/nodewatch

var pwd = __dirname

function startsWith(str, prefix) {
    return ( str.indexOf(prefix) == 0);
}
function assert(bool) {
    if (!bool) {
        FAILED_ASSERT()
    }
}
assert(startsWith('abc', 'a'))

function pathLeafNoExtension(path) {
    var fileName = path.split('/').splice(-1)[0]
    fileName = fileName.split('.')[0]
    return fileName
}
assertEqual('bar', pathLeafNoExtension('/foo/bar'))
assertEqual('bar', pathLeafNoExtension('/foo/bar.txt'))
assertEqual('bar', pathLeafNoExtension('bar.txt'))

function assertEqual(expected, actual) {
    if (expected != actual) {
        console.log(">>> ERROR:");
        console.log("EXPECTED ", "'" + expected + "'", ", but had ", "'" + actual + "'");
        assert(false);
    }
}

function assertArraysEqual(expected, actual) {
    var diff = lodash.difference(expected, actual)
    if (diff.length > 0) {
        console.log('----------');
        console.log('Comparing', expected, 'to', actual);
        console.log('diff=', diff);
        console.log('Expected', expected, 'got', actual);
        assert(false)
    }
}
/*
 * @param testDirPrefix: '/test/unit' or '/test/integration'.
 * @param testClassSuffix: 'Tests' or 'IntegrationTests'.
 */
function pushTestNameIfItExists(collection, relPath, testDirPrefix, testClassSuffix) {
    // Look for Unit or Integration tests.
    var pathToTest = relPath.replace('.groovy', testClassSuffix + '.groovy')
        .replace('/grails-app/controllers', testDirPrefix)
        .replace('/grails-app/domain', testDirPrefix)
        .replace('/grails-app/services', testDirPrefix)
        .replace('/grails-app/taglib', testDirPrefix)
        .replace('/grails-app/utils', testDirPrefix)
        .replace('/src/groovy', testDirPrefix)
    // console.log ( 'Looking for',pwd+pathToTest );
    // console.log ( 'relPath=', relPath, 'pathToTest =', pathToTest  );
    if (relPath != pathToTest && fs.existsSync(pwd + pathToTest)) {
        collection.push(pathLeafNoExtension(pathToTest));
    }
}

/** Run a regex over [code] to find 'RunTest' commands. */
function findRunTestCommands(code) {
    var myRegexp = new RegExp('//\\s*RunTest\\s+(\\S*)', 'g');   // http://www.w3schools.com/jsref/jsref_obj_regexp.asp
    // If your regular expression uses the "g" flag, you can use the exec method multiple times to find successive matches in the same string. -- https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/RegExp/exec
    var results = []
    var match;
    while ((match = myRegexp.exec(code)) != null) {                               // http://stackoverflow.com/questions/5166862/javascript-regular-expression-iterator-to-extract-groups
        // console.log("matched ", match[1]);
        results.push(match[1]);
    }
    return results;
}

assertArraysEqual(findRunTestCommands('// RunTest unit/testname'), ['unit/testname'])
assertArraysEqual(findRunTestCommands('// RunTest unit/t1\n// RunTest unit/t2'), ['unit/t1', 'unit/t2'])
assertArraysEqual(findRunTestCommands('// RunTest blah'), ['blah'])

/** Find 'RunTest' commands in [code], and add them to [unitTestNames] or [integrationTestNames]. */
function findRunTestCommentsInCode(code, unitTestNames, integrationTestNames) {
    var runTestComments = findRunTestCommands(code);

    for (var i = 0; i < runTestComments.length; i++) {
        var comment = runTestComments[i];
        if (startsWith(comment, 'unit/')) {
            unitTestNames.push(comment.split('/')[1]);
        }
        else if (startsWith(comment, 'integration/')) {
            integrationTestNames.push(comment.split('/')[1]);
        }
        else {
            console.log("ERROR - unrecognized 'RunTest' comment", comment);
            console.log('RunTest comments should be followed by "unit/MyUnitTests" or "integration/MyIntegrationTests".');
        }
    }
}

function assertRunTestComments(code, expectedUTs, expectedITs) {
    var uts = [], its = []
    findRunTestCommentsInCode(code, uts, its)
    assertArraysEqual(expectedUTs, uts)
    assertArraysEqual(expectedITs, its)
}

assertRunTestComments('', [], [])
assertRunTestComments('// RunTest unit/testname', [ 'testname'], [])
assertRunTestComments('// RunTest integration/testname', [], ['testname'])

/* Given the relative path to files, return the command to run the tests for it. */
function commandForFiles(relPaths, lookInsideFiles ) {
    var unitTests = [], integrationTests = [];

    //-- Look at what files changed, and determine applicable tests.
    for (var i = 0; i < relPaths.length; i++) {
        var relPath = relPaths[i];
        if (!fs.existsSync(pwd + relPath)) {
            continue;
        }
        if (startsWith(relPath, '/test/unit')) {
            unitTests.push(pathLeafNoExtension(relPath));
        }
        else if (startsWith(relPath, '/test/integration')) {
            integrationTests.push(pathLeafNoExtension(relPath));
        }
        else { // Another type of file was changed. Look for a corresponding test.
            lookInsideFiles = typeof lookInsideFiles !== 'undefined' ? lookInsideFiles : true;
            // Does the file have 'RunTest' comments?
            if ( lookInsideFiles ) {
                var code = fs.readFileSync(pwd + relPath);
                findRunTestCommentsInCode(code, unitTests, integrationTests)
            }
            pushTestNameIfItExists(unitTests, relPath, '/test/unit', 'Tests')
            pushTestNameIfItExists(integrationTests, relPath, '/test/integration', 'IntegrationTests')
        }
    }
    // console.log ( 'UTS=', unitTests, 'ITS=', integrationTests );

    //-- Build a command to run the tests.
    var cmd = null;
    // TEMPHACK TO RUN A SINGLE METHOD
//    if ( unitTests[0] == 'ProjectControllerTests') {
//        unitTests[0] = 'ProjectControllerTests.testJW'
//    }
    if (unitTests.length > 0 && integrationTests.length == 0) {
        cmd = "test-app -unit " + unitTests.join(' ')
    }
    else if (unitTests.length == 0 && integrationTests.length > 0) {
        cmd = "test-app -integration " + integrationTests.join(' ')
    }
    else if (unitTests.length > 0 && integrationTests.length > 0) {
        cmd = "test-app " + unitTests.join(' ') + ' ' + integrationTests.join(' ')
    }
    return cmd;
}

var gRunningTests = false;   // Semaphore to prevent concurrent job runs.
var gChangedFiles = [];      // List of relative paths to changed files.
var gLastTestsFailed = false;
var gTestsPaused = false;
var gCommandLineOptions = '';

/* Process [gChangedFiles], if there are any files. */
function runTestsForChangedFiles() {
    if (!gRunningTests && gChangedFiles.length > 0 && !gTestsPaused ) {
        var strChangedFiles = gChangedFiles.join(' ');
        var cmd = commandForFiles(gChangedFiles);
        gChangedFiles = [];
        if (cmd == null) {
            console.log("Don't know what to run for", strChangedFiles);
            return;
        }

        var startTime = new Date().getTime();
        console.log('---------')
        console.log('Running', cmd)
        gRunningTests = true;
        exec("grails " + cmd + ' ' + gCommandLineOptions, function (error, stdout, stderr) {
            var elapsedTime = (new Date().getTime() - startTime) / 1000;
            gRunningTests = false;

            if (error !== null) {
                console.log('exec error: ' + error);
                util.print('stdout: ' + stdout);
                util.print('stderr: ' + stderr);
                growl('Error Running Tests')
            }
            var failed = (stdout.indexOf('Tests FAILED') != -1);
            if (failed) {
                if (error == null ) {
                    util.print('stdout: ' + stdout);
                    util.print('stderr: ' + stderr);
                }
                growl('Tests FAILED')
                // Don't open HTML multiple times; it gets annoying.
                // exec syntax: http://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
                if (!gLastTestsFailed) {
                    exec('open target/test-reports/html/index.html', function (error2, stdout, stderr) {
                    })
                }
            } else {
                // Should we GROWL when tests are OK? ... deciding not to for now.
                // growl('Tests OK')
                console.log('OK           in', elapsedTime) // ('PASSED in',elapsedTime)
            }
            gLastTestsFailed = failed;
        });
    }
}
var OPTS_FILE = 'GrailsTestsOpts.json'

function exp(val) {
   return (typeof val) +':'+ val
}

function readOptionsFromFile() {
    var json = fs.readFileSync('./' + OPTS_FILE);

    var cfg = JSON.parse ( json );
    // console.log ( 'cfg.pause.value=', exp(cfg.pause.value), ', gTestsPaused=', exp(gTestsPaused) );
    var wantPause = ( cfg.pause.value === 'true' || cfg.pause.value === 'y' || cfg.pause.value === 't' )
    if ( wantPause !== gTestsPaused ) {
        gTestsPaused = wantPause;
        console.log ( gTestsPaused ? "PAUSING tests." : "RESUMING Tests." );
    }

    if ( cfg.commandLineOptions.value !== gCommandLineOptions ) {
        gCommandLineOptions = cfg.commandLineOptions.value;
        console.log ( "Using command line options " + gCommandLineOptions );
    }
}

watch
    .add("./grails-app", true)
    .add("./src", true)
    .add("./"+OPTS_FILE, true)
    .add("./test", true)
    .onChange(function (file, prev, curr, action) { // See https://npmjs.org/package/nodewatch
        //
        var relFile = file.replace(pwd, '')
        if ( relFile == '/'+OPTS_FILE ) {
            readOptionsFromFile();
        }
        else if (!lodash.contains(gChangedFiles, relFile)) {
            gChangedFiles.push(relFile)    // Add to Queue so this change will be run the next time.
            // console.log('Saw', action, 'in', pathLeafNoExtension(relFile))
            console.log(action, pathLeafNoExtension(relFile))
        }
        runTestsForChangedFiles();
    });

setInterval(function () {
    runTestsForChangedFiles();
}, 1000);

readOptionsFromFile();
console.log ( '-----------------------------------------------------------------------------------------------------' );
console.log ( 'Watching ' + pwd + '... edit GrailsTestOpts.json to pause/resume.' );
console.log ( '-----------------------------------------------------------------------------------------------------' );
