const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const message = core.getInput('message');
    const permission = core.getInput('permission');

    if (!message || !permission) {
      throw new Error('Action must set message and permission');
    }

    const client = new github.GitHub(
      core.getInput('repo-token', {required: true})
    );
    const context = github.context;
    const payload = context.payload;

    if (!payload.issue && payload.action !== 'opened') {
      core.debug('No issue was opened, skipping');
      return;
    }

    if (!payload.sender) {
      throw new Error('Internal error, no sender provided by GitHub');
    }

    const issue = context.issue
    const userPermission = await client.repos.getCollaboratorPermissionLevel({
      owner: issue.owner,
      repo: issue.repo,
      username: github.context.actor
    })
    const permissionLevel = userPermission.data.permission

    if (permissionLevel == permission) {
      core.debug('Issue was opened by authorized user, keeping issue open');
      return;
    }

    core.debug(`Adding message: ${message} to Issue #${issue.number}`);
    await client.issues.createComment({
      owner: issue.owner,
      repo: issue.repo,
      issue_number: issue.number,
      body: message
    });

    core.debug('Closing issue');
    await client.issues.update({
      owner: issue.owner,
      repo: issue.repo,
      issue_number: issue.number,
      state: 'closed'
    });
  } catch (error) {
    core.setFailed(error.message);
    return;
  }
}

run();
