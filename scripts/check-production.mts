import {deploymentProblems} from '../src/lib/deployment.ts';
const problems=deploymentProblems();if(problems.length){for(const problem of problems)console.error(problem);process.exitCode=1;}else console.log('Configuration checks passed. This does not verify DNS, provider credentials, HTTPS issuance or email delivery.');
