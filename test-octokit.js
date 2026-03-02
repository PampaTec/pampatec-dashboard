import { Octokit } from "@octokit/rest";

const token = process.env.GITHUB_TOKEN;
const octokit = new Octokit({ auth: token });

async function run() {
  try {
    const { data } = await octokit.rest.orgs.listMembers({
      org: 'PampaTec',
      role: 'admin'
    });
    console.log(data.map(u => u.login));
  } catch(e) { console.error(e.message); }
}
run();
