GrailsTests
===========

Node.js script to watch file system for changes, run Grails tests when files change. Currently only tested on OSX.

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