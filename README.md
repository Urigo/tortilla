# Tortilla

![tortilla](https://cloud.githubusercontent.com/assets/7648874/20839550/3c0d4f14-b894-11e6-8998-a63107385344.png)

Tortilla is a framework for building tutorials based on git and NodeJS which will help you create AWESOME tutorials and upload them to any git-host which supports markdown rendering, like GitHub. Tortilla operates by simply wrapping an existing git project, thus providing you with some advanced git functions dedicated to create the most perfect and most beautiful tutorial in the world. In addition, Tortilla is easily accessible through a CLI, making it very convenient to use.

What's the advantages of using Tortilla over writing a simple blog-post?
- The code and the instructions will always stay correlatively updated.
- You can reference code snippets directly from the instructions.
- You can use template-helpers to write complex instructions with minimal efforts.
- You can take advantages of most git features like creating commits, tags and branches.
- You can use neat features natively provided with the git host like reporting issues and opening pull requests.
- The tutorial is linked directly to your git host account.
- You can enjoy the great traffic of the git host.
- You can easily navigate through the project at any specific point of the tutorial.
- You can historicize different versions of your tutorial.
- You can compare different versions of the tutorial and see the differences.
- The list goes on and on and on...

Tutorials for example:
- [How to implement a game engine in JavaScript and build a Tron-style game](https://github.com/DAB0mB/radial-snake)
- [How to build a Whatsapp-clone using Ionic 2 CLI and Meteor](https://github.com/Urigo/Ionic2CLI-Meteor-WhatsApp)

If you're not familiar with Tortilla I recommend you to go through the this `README.md` file since it contains everything you have to know about Tortilla in order to use it.

[![intro](https://img.youtube.com/vi/dHfmN1NtcUk/0.jpg)](https://www.youtube.com/watch?v=dHfmN1NtcUk)

> **⚠** Video is outdated!

## Tutorial Structure

### Commits

Each commit should represent a single step in the tutorial, using the following message template:

    Step (step index): (step description)

Here's a list of commits for example:

    Step 2: Add todo-list
    Step 2.3: Add todo-list controller
    Step 2.2: Add todo-list view
    Step 2.1: Add todo-list model
    Step 1: Bundling
    Step 1.3: Install the necessary packages for Webpack's build
    Step 1.2: Add Webpack build to gulp tasks
    Step 1.1: Create a basic Webpack config
    How to create a todo list

As you can see, some of the commits represent a [sub-step](#sub-step) (e.g. step 1.1, 1.2) and some of them represent a [super-step](#super-step) (e.g. step 1, 2); Together they form a whole single step. Note that the only exception is the root commit whose message can be whatever you feel like, but the rest of the commits **must** follow these rules, otherwise you will encounter some unexpected behaviors.

> Credit goes to **[@stubailo](http://www.github.com/stubailo)** who originally came up with the commit templates concept.

### Sub Step

A sub-step is a small portion of the whole step. Each sub-step should usually represent a small change which should be followed by an explanation in the tutorial. Sub-steps should be sorted by their chronological order; Sub-steps which assemble the same step should have the same super index, and a consecutive sub index separated by a period (e.g. 1.1, 1.2).

### Super Step

A super-step should **always** come at the end of each step, and should be represented with a single index (e.g. 1, 2). The super-step should add a manual file which goes through the implementation of the associated step. The manual file is a simple markdown file which should be located under the `steps` directory and its name should be `step(index).md`. For more information about manual files, see the [manuals](#manuals) section.

## Manuals

As for the project structure itself, the only thing you should be aware of is the `manuals` directory, which contains a `templates` directory and a `views` directory. Here's an example structure for a `manuals` directory:

    manuals
    ├─ templates
    │  ├ root.md.tmpl
    │  ├ step1.md.tmpl
    │  ├ step2.md.tmpl
    │  └ step3.md.tmpl
    └─ views
       ├ root.md
       ├ step1.md
       ├ step2.md
       └ step3.md

Templates are used for development, they are easy to edit and work with since they provide you with some handy [template helpers](#template-helpers). On the other hand, we have the views, which are not as comfortable to work with, and are very comfortable to look at, and will most likely be used by the viewers. The message of the current step's commit will be used as its belonging manual's title (header), and a navigation bar will be rendered automatically at the button of each manual (footer). The header and the footer can be overridden by defining custom templates called `header.md.tmpl` and `footer.md.tmpl` in the root commit.

### Template Helpers

Template helpers are used when writing a manual file to make our-lives a bit easier when it comes to formatting complex views. The templates are rendered using [Handlebars](http://handlebarsjs.com/), so I recommend you to go through its syntax so you can be familiar with it.

These are the available {{view models}}:
- **step** - The number of the current step.
- **commit_message** - The current commit message.

These are the available {{{template helpers}}}:
- **nav_step** - A navigation bar between step manuals. Will present two buttons - "Previous step" and "Next step". This template helper may receives the following options:
  - **prev_ref** - The reference which we will be redirected to once pressed on "Previous step" button.
  - **next_ref** - The reference which we will be redirected to once pressed on "Next step" button.
- **diff_step <step>** - Will run `git diff` for the specified step's commit. This template helper may receives the following options:
  - **files** - A list of specific file paths separated by a comma (`,`) that we would like to present in our diff. The rest of the files in the diff will be ignored.

## Releases

A Tortilla project may contain [release tags](#release-tags) which represent different versions of the tutorial in different time points. Here's a list of tags for example:

    master@root@0.0.1
    master@step1@0.0.1
    master@0.0.1
    master@root@0.1.0
    master@step1@0.1.0
    master@0.1.0
    foo@root@0.0.1
    foo@step1@0.0.1
    foo@0.0.1

In addition, a stack of all the releases is available through a [history branches](#history-branches):

    master-history
    foo-history

### Release Tags

A release tag should represent the tutorial at a specific state (e.g. master branch step2) and time point (e.g. version 1.2.1). A release tag should contain the name of the branch, the step descriptor, if at all, and a [semver](http://semver.org/) version, separated with at (`@`) signs (e.g. `master@step1@0.0.1`, `foo@0.1.0`).

### History Branches

The history is specific for a certain branch. Its name should end with `history` preceded by the branch name (e.g. `master-history`). Each commit in that branch represents all the changes made in a specific release, making the comparison between releases much easier (even if they have different roots!). Here's an example of a commits list in a history branch named `master-history`:

    master@1.0.0: Add favorites page
    master@0.0.2: Update step 2
    master@0.0.1: Initial tutorial creation

## How to Start

First you will need to install Tortilla's CLI tool:

    $ sudo npm install tortilla -g

Once you have it installed you can go ahead and create a new Tortilla project:

    $ tortilla create "project name" --message="commit message" --output="output path"

This command will initialize a new Tortilla project in the provided path (Defaults to the current path). The project will be initialized with the provided project name (Defaults to `tortilla-project`) and the provided message as the initial commit message (Will open an editor if no message is provided). If the output path already exists a prompt verifying your decision will show up. To automatically skip it you can provide an optional `--override` option.

Anytime you clone a Tortilla project from a git-host you will need to re-initialize it so Tortilla can work properly:

    $ tortilla init "project path"

An optional project path can be provided when initializing Tortilla (Defaults to current dir). As for now this command has no restrictions and can be used on any project, but is not guaranteed to work as expected, so use with caution.

A manual page for the usage of Tortilla's CLI tool can be brought any time by typing the following:

    $ tortilla --help

## Git Helpers

You've probably noticed that the rules for a valid tutorial project are very strict. This is where the git-helpers kicks in. Instead of having a rough time managing the steps list, here are some kick-ass helpers which will make your life way easier:

### Push Step

    $ tortilla step push --message="step message"

Push a new step to the top of the stack with the provided message (Will open an editor if no message is provided). If you would like to add a new step in the middle of the stack, first use the [step editing](#edit-step) helper, and then push a new step to the top of the stack.

### Pop Step

    $ tortilla step pop

Pop the last step from the top of the stack. If you would like to remove a step from the middle of the stack, first use the [step editing](#edit-step) helper, and then pop the step from the top of the stack.

### Tag Step

    $ tortilla step tag --message="step message"

Add a new super-step and finish the current step with the provided message (Will open an editor if no message is provided). This will initialize an empty manual markdown file. If you would like to edit the manual file, simply use the [step editing](#edit-step) helper and amend your changes to the recent commit.

### Edit Step

    $ tortilla step edit "step index"

Edit the provided step. This will get you into rebase mode, so once you've finished editing your step, just type `git rebase --continue` and let git do its magic. You can add, remove and tag new steps during editing without worrying about the upcoming commits, this helper is smart enough to adjust their content and messages based on your actions. An optional `--root` option can be provided if you would like to edit the root. If no step is specified, the last step will be edited by default.

### Sort Step

    $ tortilla step sort "step index"

Sort all the step indexes in the given super step, e.g. assuming we have step `2.1`, `2.4` and `2.3` and we would like to sort them, we will simply run this command with a step index of `2`. This is useful when cherry-picking from other repositories or branches and the steps are not in the right order. If provided with `--root`, all steps in the commits list will be sorted. If no step was provided, it will sort the last super step by default.

### Reword Step

    $ tortilla step reword "step index" --message="step message"

Replace the provided step's message with the provided message (Will open an editor if no message is provided). An optional `--root` option can be provided if you would like to reword the root. If no step is specified, the last step will be reworded by default.

### Render Manual

    $ tortilla manual render "step index"

Renders and rebases specified step's manual. If you would like to render the root manual you can provide a `--root`. If you would like to render all manuals since the beginning of history you can provide a `--all` option. If no step is specified, the last manual will be rendered by default.

### Bump Release

    $ tortilla release bump "release type" --message="release message"

Whenever making changes in the tutorial using Tortilla, the commits are being overridden, a behavior we're not always interested in, since sometimes we would like to reference or view previous releases of the tutorial. The `release` command solves this problem by creating [release tags](#release-tags) which are used as snap shot for the current tutorial state. The first argument of this command is the release type and must be one of `major`, `minor` or `patch`. The `message` argument is optional, and should provide a short description message for the release. If no message is provided, a text editor will be opened, where you can type the change-log of the release. The change-log will be attached to the `root` tag. Once a version has been released, a new [history branch](#history-branches) will be created.

### Get Release

    $ tortilla release current

Gets the current tutorial release based on the latest matching [release tag](#release-tags).

### Diff Release

    $ tortilla release diff "source release" "destination release"

Runs `git diff` between `source release` and `destination release`. An additional arguments vector might be appended which will be invoked as is when running `git diff`.

### Get Strict Mode

    $ tortilla strict get

Gets the current status of strict mode. By default, a newly initialized Tortilla project will be set to be in strict mode, which will restrict you doing from running git operations out side git's scope.

### Set Strict Mode

    $ tortilla strict set "mode status"

Sets the status of strict mode. Any falsy or truthy value will do. Once strict mode is set, an approval message will be printed to terminal.

## License

MIT