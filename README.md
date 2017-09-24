![image](https://user-images.githubusercontent.com/18563015/30778335-4ed142c2-a0a1-11e7-845b-56105a006362.png)

## An intuitive, and sensationally easy to use CLI for initializing git repos

### Features:
- Authenticate with Github once and forget!
- Two-factor authentication support
- Repo name defaults to directory name, or enter your own
- .gitignore creation wizard, pick from a list of common defaults if your directory is empty, or choose from the files/folders in your root path
- Adds all files in directory and commits with "initial commit"
- Adds remote repository and pushes code

### Requirements:
- Git
- NodeJS
- A Github account

### How to install and use:
- Clone repository
- Run `npm install` to install dependencies
- Run `npm i -g` to install the module globally
- After running the above, the `gitup` command will be available globally.
- To use:
  - In an existing or new directory, run `gitup` or `gitup <my-repo-name> <my-repo-description>`
  - The arguments are optional, and even if you use them, you can always change these fields later
  - You will then be prompted for your Github username and password (don't worry, passwords are not stored, and personal access token are encrypted)
  - Then run through the setup wizard!
  - Enjoy!
