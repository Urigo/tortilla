# Tortilla

[![CircleCI](https://circleci.com/gh/Urigo/tortilla.svg?style=svg&circle-token=12d30ba8bd17ea8294ef5430fbeb60af1474ab73)](https://circleci.com/gh/Urigo/tortilla)

<p align="center"><img src="https://cloud.githubusercontent.com/assets/7648874/24250888/833ec58e-0fbf-11e7-95e5-42d5827f0dd6.png" alt="tortilla" width="500"></p>

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

[![intro](https://cloud.githubusercontent.com/assets/7648874/25558853/02cbaaf4-2d0e-11e7-89db-9aff3c87cc18.png)](https://www.youtube.com/watch?v=uboqQ8B4XFk)

## Tutorial Structure

See:
- [steps](#steps)
  - [sub-steps](#sub-step)
  - [super-steps](#super-steps)
- [manuals](#manuals)
  - [translations](#translations)
  - [template-helpers](#template-helpers)
- [releases](#releases)
  - [release-tags](#release-tags)
  - [history-branches](#history-branches)
- [submodules](#submodules)

### Steps

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

As you can see, some of the commits represent a [sub-step](#sub-step) (e.g. step 1.1, 1.2) and some of them represent a [super-step](#super-step) (e.g. step 1, 2); Together they form a whole single step. Note that the only exception is the root commit whose message can be whatever you'd like (will most likely be something which describes the tutorial), but the rest of the commits **must** follow these rules, otherwise you will encounter some unexpected behaviors.

> Credit goes to **[@stubailo](http://www.github.com/stubailo)** who originally came up with the commit templates concept.

**Related CLI:** [tortilla-step CLI](#tortilla-step-cli)

#### Sub Step

A sub-step is a small portion of the whole step. Each sub-step should usually represent a small change which should be followed by an explanation in the tutorial. Sub-steps should be sorted by their chronological order; Sub-steps which assemble the same step should have the same super index, and a consecutive sub index separated by a period (e.g. 1.1, 1.2).

#### Super Step

A super-step should **always** come at the end of each step, and should be represented with a single index (e.g. 1, 2). The super-step should add a [manual](#manuals) file which goes through the implementation of the associated step.

### Manuals

Manuals are markdown files which should contain some handy instructions regards the implementation of each step in the tutorial. The manuals are located under the `.tortilla/manuals` directory, and are separated into 2 directories - `templates` and `views`. When writing manuals, we should never touch the `views` files, because they should be auto-generated by Tortilla's CLI. The `templates` directory, as the name suggests, should contain manual templates. Just so you can get the idea, here's an example of a `.tortilla/manuals` directory structure:

    .tortilla/manuals
    ├─ templates
    │  ├ root.tmpl
    │  ├ step1.tmpl
    │  ├ step2.tmpl
    │  └ step3.tmpl
    └─ views
       ├ root.md
       ├ step1.md
       ├ step2.md
       └ step3.md

The main difference between a manual template and a manual view is that templates are more simplified and will be most likely used for development purposes. They contain some handy [template helpers](#template-helpers) we can be used to render complex markdown components, so our tutorial can be good-looking and easy-to-read, with minimum maintenance. As you can see in the files tree above, manual template files have an extension of `.tmpl`, unlike their belonging views which finish with an extension of `.md`. That's because the manual templates are not exactly markdown files, since they are packed with some extra syntactic abilities provided by [Handlebars'](http://handlebarsjs.com/) simple yet powerful templating engine. Indeed, you can still use markdown's templating syntax, but just know that this is not a pure markdown we're talking about. The only template-view fs correlation exception is the `root.tmpl` file which should be mapped to the `README.md` file, so we can see a nice introduction for our tutorial when entering the repository. The `root.md` file is just a symbolic link to the main `README.md` file.

Note that manual templates shouldn't be written with a title, since it should be attached automatically when rendering the template's view using its belonging commit message. In addition, a navigation bar between steps should be appended at the end of the manual. For example, a root manual template which looks likes this:

```
- FOO
- BAR
- BAZ
```

And is matched with the commit message:

    Les Trois Mousquetaires

Should result with the following view after rendering:

```md
# Les Trois Mousquetaires

- FOO
- BAR
- BAZ

[{]: <helper> (navStep)

| [Begin Tutorial >](manuals/views/step1.md) |
|----------------------:|

[}]: #
```

**Related CLI:** [tortilla-manual CLI](#tortilla-manual-cli)

#### Translations

Manuals don't necessarily have to be written in English, and can be also be written in whatever language you'd choose. Translated manual templates are located under the `templates/locales/your-language` path, and their belonging views are localed under `views/locales/your-language`. Here's an example of a manuals directory with manuals which are translated into Hebrew (`he`):

    .tortilla/manuals
    ├─ templates
    │  ├ root.tmpl
    │  ├ step1.tmpl
    │  ├ step2.tmpl
    │  ├ step3.tmpl
    │  └ locales/he
    │    ├ root.tmpl
    │    ├ step1.tmpl
    │    ├ step2.tmpl
    │    └ step3.tmpl
    └─ views
       ├ root.md
       ├ step1.md
       ├ step2.md
       ├ step3.md
       └ locales/he
         ├ root.md
         ├ step1.md
         ├ step2.md
         └ step3.md

Translations for step messages (and potentially other stuff) can be defined under the `.tortilla/locales` directory in a `json` file with the relevant language code (e.g. `.tortilla/locales/he.json`). Here's an example of a translation file which translates step messages:

```json
{
  "step": {
    "root": "כיצד ליצור רשימת מטלות",
    "1.1": "יצירת קובץ הגדרות בסיסי ל Webpack",
    "1.2": "הוספת משימה של בנייה בעזרת Webpack לרשימת המשימות של gulp",
    "1.3": "התקנת החבילות הנחוצות בכדי שנוכל לבנות בעזרת Webpack",
    "1": "צרירת הפרוייקט",
    "2.1": "יצירת מודל למטלה יחידה",
    "2.2": "יצירת רשימת מטלות ויזואלית",
    "2.3": "יצירת רשימת מטלות לוגית",
    "2": "הוספת רשימת מטלות"
  }
}
```

#### Template Helpers

Template helpers are used when writing a manual file to make our lives a bit easier when it comes to formatting complex markdown components. The templates are rendered using [Handlebars'](http://handlebarsjs.com/) templating, so I recommend you to go through its rules and syntax so you can be familiar with it, but just for the heck of demonstration, a manual template file which looks like this:

```
*Here's how we should use template-helpers*

{{{diffStep 1.1}}}
```

Should be rendered to:

```md
*Here's how we should use template-helpers*

[{]: <helper> (diffStep 1.1)

#### Step 1.1: Demo commit

##### Added demo-file.js
\`\`\`diff
@@ -0,0 +1,3 @@
+┊ ┊1┊foo
+┊ ┊2┊bar
+┊ ┊3┊baz🚫↵
\`\`\`

[}]: #
```

**🌟 Available {{view models}} 🌟**

- `step` - The number of the current step.

- `commit_message` - The current commit message.

**🌟 Available {{{template helpers}}} 🌟**

- `navStep` - A navigation bar between step manuals. Will present two buttons - "Previous step" and "Next step". This template helper may receives the following options:
  - `prevRef` - The reference which we will be redirected to once pressed on "Previous step" button.
  - `nextRef` - The reference which we will be redirected to once pressed on "Next step" button.

- `diffStep <step>` - Will run `git diff` for the specified step's commit. This template helper may receives the following options:
  - `files` - A list of specific file paths separated by a comma (`,`) that we would like to present in our diff. The rest of the files in the diff will be ignored.
  - `module` - The name of the submodule which contains the step we would like to reference.
  - `noTitle` - A flag which indicates whether we should render the step title prior to diffs or not.

### Releases

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

In addition, a stack of all the releases is available through [history branches](#history-branches):

    master-history
    foo-history

**Related CLI:** [tortilla-release CLI](#tortilla-release-cli)

#### Release Tags

A release tag should represent the tutorial at a specific state (e.g. step 2 of master branch) and time point (e.g. version 1.2.1). A release tag should contain the name of the branch, the step descriptor, if at all, and a [semver](http://semver.org/) version, separated with at (`@`) signs (e.g. `master@step1@0.0.1`, `foo@0.1.0`).

#### History Branches

The history is specific for a certain branch. Its name should end with `history` preceded by the branch name (e.g. `master-history`). Each commit in that branch represents all the changes made in a specific release, making the comparison between releases much easier (even if they have different roots!). Here's an example of a commits list in a history branch named `master-history`:

    master@1.0.0: Add favorites page
    master@0.0.2: Update step 2
    master@0.0.1: Initial tutorial creation

### Submodules

Often times, we would like to have a single repository where we include all the manual files, and the implementation logic would be implemented in different repositories which will be referenced from the main repository using git's submodules architecture; E.g. a single repository that includes submodules referencing the client and the server. Another advantage for that architecture is that we can implement similar applications using different stacks, or having a single back-end for multiple front-end applications, with almost identical instructions.

**Related CLI:** [tortilla-submodule CLI](#tortilla-submodule-cli)

## Quick Startup

First you will need to install Tortilla's CLI tool:

    $ sudo npm install tortilla -g

Once you have it installed you can go ahead and create a new Tortilla project:

    $ tortilla create my-tutorial -m "How to create my app"

This command will initialize a new Tortilla project called `my-tutorial` with an initial commit message of `How to create my app`.

To clone the project, use the following command:

    $ tortilla clone git@github.com:John/my-tutorial.git

You shouldn't be using git as Tortilla exposes all the necessary commands for it to work and contains additional logic and restrictions that will ensure that it operates as expected.

A manual page for the usage of Tortilla's CLI tool can be brought any time by typing the following:

    $ tortilla --help

For further information, I'd recommend you going through the [CLI](#CLI) section.

## CLI

See:

- [tortilla](#tortilla-cli)
  - [tortilla-dump](#tortilla-dump-cli)
  - [tortilla-manual](#tortilla-manual-cli)
  - [tortilla-release](#tortilla-release-cli)
  - [tortilla-step](#tortilla-step-cli)
  - [tortilla-strict](#tortilla-strict-cli)
  - [tortilla-submodule](#tortilla-submodule-cli)
  - [tortilla-package](#tortilla-package-cli)

### tortilla CLI

**command:** `tortilla create [name]`

Creates a new Tortilla project with the provided name.

- *option:* `-o, --output [path]` - The output path of the newly created project.
- *option:* `-m, --message [message]` - The created project's initial commit's message.
- *option:* `--override` - Override project directory if already exists.

**command:** `tortilla init [name]`

Initializes Tortilla essentials in the provided project.

**command:** `tortilla push <remote> <branch>`

Push a tutorial based on the provided branch. e.g. given `master` then `master-history`, `master-root`, `master@0.1.0`, etc, will be pushed. Note that everything will be pushed by FORCE and will override existing refs within the remote, **even deleted refs**.

**command:** `tortilla pull <remote> <branch>`

Pull a tutorial based on the provided branch. e.g. given `master` then `master-history`, `master-root`, `master@0.1.0`, etc, will be pulled.

**command:** `tortilla status`

Will print the tutorial status prior to git-status. If for example, we're editing step 1.2, this will print `Editing step 1.2`. In case there's a conflict, let's say between steps 1.2 and 1.3, this will print `Solving conflict between step 1.2 (HEAD) and step 1.3`.

- *option:* `-i, --instruct` - Print additional instructions: how to continue from current state. Am I allowed to push new steps? Should I amend my changes? etc.

### tortilla-dump CLI

**command:** `tortilla dump create [out]`

Dumps tutorial data as a JSON file. The default dump file name would be `tutorial.json`, although an optional output path might be provided. Here's a brief description of the schema of the generated dump file:

```json
[
  {
    "branchName": "Current branch",
    "historyBranchName": "History branch matching current branch",
    "releases": [
      {
        "ReleaseVersion": "x.x.x",
        "tagName": "The name of the tag",
        "tagRevision": "The revision of the tag",
        "historyRevision": "Commit hash based on history branch",
        "changesDiff": "Diff with most recent release",
        "manuals": [
          {
            "manualTitle": "Step commit message",
            "stepRevision": "Step commit revision",
            "manualView": "Manual view content"
          }
        ]
      }
    ]
  }
]
```

- *option:* `--filter [filter]` - A list of branches we would like to filter separated with spaces.
- *option:* `--reject [reject]` - A list of branches we would like to reject separated with spaces.
- *option:* `--override` - Override file if already exists.

**command:** `tortilla dump diff-releases <dumpFile> <srcRelease> <dstRelease>`

Creates a diff between two specified releases in a given dump file. Useful when we would like to create the diff independently from the git-project.

### tortilla-manual CLI

For more information see the [manuals](#manuals) section.

**command:** `tortilla manual render [step]`

Renders specified manual view.

- *option:* `--root` - Render root manual (`README.md`).
- *option:* `--all` - Render all manuals.

### tortilla-release CLI

For more information see the [releases](#releases) section.

**command:** `tortilla release bump <type>`

Bumps the current release of the tutorial. This will create some new release tags accordingly and will update the associated history branch. The provided type represents a [semver version type](http://semver.org/) (major, minor and patch) we would like to bump. We can also specify `next` as the release number which will then store a weak reference to the potential upcoming version; this means that by the time we release another `next` version or another stable release, the most recent `next` version should be overridden.

- *option:* `-m, --message [message]` - A message describing the newly created release. If not provided, and editor will be opened instead where we can type a full document.

**command:** `tortilla release bump <type>`

Reverts release to the most recent one. For example, if we have 2 releases: `master@2.0.0` and `master@1.0.0`, this command will delete `master@2.0.0`, leaving `master@1.0.0`. If no more releases are left, the `history` branch will be deleted. This is useful if we've released something by accident and we would like to fix it.

**command:** `tortilla release list [branch]`

Prints a list of all releases of the given `branch`. If no `branch` was provided, the active branch will be used by default.

**command:** `tortilla release current`

Prints the current release.

**command:** `tortilla release diff <sourceRelease> <destinationRelease>`

Runs `git diff` between 2 specified releases. This will also be able to run the operation between 2 different releases which are completely different from their root! You can also provide this command with some additional native [git-diff options](https://git-scm.com/docs/git-diff#_options).

### tortilla-step CLI

For more information see the [steps](#steps) section.

**command:** `tortilla step push`

Pushes a new step. Staged files will be committed along with this step.

- *option:* `-m, --message [message]` - A message describing the newly created step.

**command:** `tortilla step pop`

Pops the most recent step. This will completely discard the step's changes.

**command:** `tortilla step tag`

Mark this step as finished and move on to the next one. This will increase the index of the [super-step](#super-steps) and zero the index of the [sub-step](#sub-steps).

- *option:* `-m, --message [message]` - A message describing the newly created step.

**command:** `tortilla step edit [...steps]`

Edits the specified steps. A step can be specified either by index or by git-ref. This will enter rebase mode where the step's hash is at. Once finished editing, you may proceed using [git-rebase commands](https://git-scm.com/docs/git-rebase). Alternatively, you can specify a range of steps e.g. `..1.5`, `1.1..` or `1.1..1.5`.

- *option:* `--root` - Edit the root step (initial commit).
- *option:* `--udiff [path]` - Updates the `diffStep` template helpers of manuals being rebased. Note that manuals prior to the current step being edited won't be updated, since the rebasing process never looks backwards. An optional can be provided which will be a reference to another repository which contains the current repository as a submodule; This will result in updating the provided repository's manuals rather than the current one. Note that submodule's package names located in `package.json` should be distinct.

**command:** `tortilla step back [targetStep]`

Like `git rebase --continue`, only it will go back instead of moving forward. Checkpoints will be based on the steps we've originally provided to the command `tortilla step edit`, e.g. `tortilla step edit 1.1 1.2 1.3` will have steps `1.1`, `1.2` and `1.3` as checkpoints. If no step was provided, we will go back to the most recent step by default. `targetStep` either represents one of the provided steps we would like to go back to, or it can represent a multiplier e.g. `x3` that will go `x` times backwards in history.

- *option:* `-i, --interactive` - Interactively pick a step from a menu.

**command:** `tortilla step reword [step]`

Rename the specified step's commit message.

- *option:* `-m, --message [message]` - The new message of the reworded step. If not provided, and editor will be opened instead where we can type a full document.

**command:** `tortilla step show <step>`

Run `git-show` for given step index.

### tortilla-strict CLI

Strict mode determines whether Tortilla's git-hook validations are enabled or disabled. It's highly recommended to leave it on, since you might accidentally digress from Tortilla's strict project rules.

**command:** `tortilla strict get`

Prints whether strict mode is enabled or disabled.

**command:** `tortilla strict set <mode>`

Sets strict mode. Provided mode must be either a truthy value (e.g. `1`, `true`) or a falsy value (`0`, `false`).

### tortilla-submodule CLI

Submodules are useful whenever you would like to split the tutorial into different logical segments, e.g. we will have the repo with all the instructions manual referencing the backend repo and the frontend repo.

**command:** `tortilla submodule add <name> <url>`

Like `$ git submodule add`, this will add the specified submodule name using the provided URL, and will detach HEAD.

**command:** `tortilla submodule remove <name>`

Will remove the submodule completely, even from the git-registry. This command doesn't exist on git and it can be very useful.

**command:** `tortilla submodule update <name>`

Will run `$ git submodule update --init`, and it will remove deleted files from stage if pointed object doesn't exist in submodule's remote.

**command:** `tortilla submodule fetch <name>`

Will fetch all objects from `origin` remote of the submodule, including tags. If the submodule is not updated, an error message will be printed instead.

**command:** `tortilla submodule reset <name>`

In other words, this will "unclone" the submodule, but will keep it initialized. This is reliable method to get away from messy situations with submodules, so whenever you don't know what to do, run this command.

**command:** `tortilla submodule checkout <name> <ref>`

This will check out the specified submodule to provided ref. It will also guide you through with some detailed instructions if you should do things beforehand, this can prevent a lot of potential issues and confusion.

### tortilla-package CLI

`package.json` related commands are useful when we wanna update our dependencies' versions all across the tutorial, without needing to deal with any conflicts across the process.

**command:** `tortilla package update-deps`

This will start the dependencies updating process by creating a temporary file will contain a list of all our dependencies (merged with dev and peer) where we can specify the new versions that we would like to use in our tutorial. Once this file has been saved and closed Tortilla will handle the rebasing process.

## License

MIT
