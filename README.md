# Tortilla

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

[![intro](https://img.youtube.com/vi/dHfmN1NtcUk/0.jpg)](https://www.youtube.com/watch?v=dHfmN1NtcUk)

> **⚠** Video is outdated!

## Tutorial Structure

See:
- [steps](#steps)
- [manuals](#manuals)
- [releases](#releases)

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

#### Sub Step

A sub-step is a small portion of the whole step. Each sub-step should usually represent a small change which should be followed by an explanation in the tutorial. Sub-steps should be sorted by their chronological order; Sub-steps which assemble the same step should have the same super index, and a consecutive sub index separated by a period (e.g. 1.1, 1.2).

#### Super Step

A super-step should **always** come at the end of each step, and should be represented with a single index (e.g. 1, 2). The super-step should add a manual file which goes through the implementation of the associated step. The manual file is a simple markdown file which should be located under the `steps` directory and its name should be `step(index).md`. For more information about manual files, see the [manuals](#manuals) section.

### Manuals

As for the project structure itself, the only thing you should be aware of is the `.tortilla/manuals` directory, which contains a `templates` directory and a `views` directory. Here's an example structure for a `.tortilla/manuals` directory:

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

Templates are used for development, they are easy to edit and work with since they provide you with some handy [template helpers](#template-helpers). On the other hand, we have the views, which are not as comfortable to work with, and are very comfortable to look at, and will most likely be used by the viewers. The message of the current step's commit will be used as its belonging manual's title (header), and a navigation bar will be rendered automatically at the button of each manual (footer). The header and the footer can be overridden by defining custom templates called `header.tmpl` and `footer.tmpl` in the root commit.

#### Translations

Manuals don't necessarily have to be written in English, and can be also be written in whatever language you'd choose. Translated manual templates are located under the `templates/locales/your-language` path, and their belonging views are localed under `views/locales/your-language`. Here's an example of a manuals directory with manuals which are translated into Hebrew:

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

Template helpers are used when writing a manual file to make our-lives a bit easier when it comes to formatting complex views. The templates are rendered using [Handlebars](http://handlebarsjs.com/), so I recommend you to go through its syntax so you can be familiar with it.

**Available {{view models}}**

- *step* - The number of the current step.
- *commit_message* - The current commit message.

**Available {{{template helpers}}}**

- *nav_step* - A navigation bar between step manuals. Will present two buttons - "Previous step" and "Next step". This template helper may receives the following options:
  - *prev_ref* - The reference which we will be redirected to once pressed on "Previous step" button.
  - *next_ref* - The reference which we will be redirected to once pressed on "Next step" button.

- *diff_step <step>* - Will run `git diff` for the specified step's commit. This template helper may receives the following options:
  - *files* - A list of specific file paths separated by a comma (`,`) that we would like to present in our diff. The rest of the files in the diff will be ignored.

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

In addition, a stack of all the releases is available through [history branches](#history-branches):

    master-history
    foo-history

### Release Tags

A release tag should represent the tutorial at a specific state (e.g. step 2 of master branch) and time point (e.g. version 1.2.1). A release tag should contain the name of the branch, the step descriptor, if at all, and a [semver](http://semver.org/) version, separated with at (`@`) signs (e.g. `master@step1@0.0.1`, `foo@0.1.0`).

### History Branches

The history is specific for a certain branch. Its name should end with `history` preceded by the branch name (e.g. `master-history`). Each commit in that branch represents all the changes made in a specific release, making the comparison between releases much easier (even if they have different roots!). Here's an example of a commits list in a history branch named `master-history`:

    master@1.0.0: Add favorites page
    master@0.0.2: Update step 2
    master@0.0.1: Initial tutorial creation

## Quick Startup

First you will need to install Tortilla's CLI tool:

    $ sudo npm install tortilla -g

Once you have it installed you can go ahead and create a new Tortilla project:

    $ tortilla create my-tutorial -m "How to create my app"

This command will initialize a new Tortilla project called `my-tutorial` with an initial commit message of `How to create my app`.

After uploading this project and cloning it, be sure to initialize Tortilla so it can work properly:

    $ git clone git@github.com:John/my-tutorial.git
    $ tortilla init my-tutorial

A manual page for the usage of Tortilla's CLI tool can be brought any time by typing the following:

    $ tortilla --help

For further information, I'd recommend you going through the [CLI](#CLI) section.

## CLI

See:

- [tortilla](#tortilla-cli)
  - [tortilla-manual](#tortilla-manual-cli)
  - [tortilla-release](#tortilla-release-cli)
  - [tortilla-step](#tortilla-step-cli)
  - [tortilla-strict](#tortilla-strict-cli)

### tortilla CLI

**command:** `tortilla create [name]`

Creates a new Tortilla project with the provided name.

- *option:* `-o, --output [path]` - The output path of the newly created project.
- *option:* `-m, --message [message]` - The created project's initial commit's message.
- *option:* `--override` - Override project directory if already exists.

**command:** `tortilla init [name]`

Initializes Tortilla essentials in the provided project.

### tortilla-manual CLI

For more information see the [manuals](#manuals) section.

**command:** `tortilla render manual [step]`

Renders specified manual view.

- *option:* `--root` - Render root manual (`README.md`).
- *option:* `--all` - Render all manuals.

### tortilla-release CLI

For more information see the [releases](#releases) section.

**command:** `tortilla release bump <type>`

Bumps the current release of the tutorial. This will create some new release tags accordingly and will update the associated history branch. The provided type represents a [semver version type](http://semver.org/) (major, minor and patch) we would like to bump.

- *option:* `-m, --message [message]` - A message describing the newly created release. If not provided, and editor will be opened instead where we can type a full document.

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

**command:** `tortilla step edit [step]`

Edits the specified step. This will enter rebase mode where the step's hash is at. Once finished editing, you may proceed using [git-rebase commands](https://git-scm.com/docs/git-rebase).

- *option:* `--root` - Edit the root step (initial commit).

**command:** `tortilla step reword [step]`

Rename the specified step's commit message.

- *option:* `-m, --message [message]` - The new message of the reworded step. If not provided, and editor will be opened instead where we can type a full document.

### tortilla-strict CLI

Strict mode determines whether Tortilla's git-hook validations are enabled or disabled. It's highly recommended to leave it on, since you might accidentally digress from Tortilla's strict project rules.

**command:** `tortilla strict get`

Prints whether strict mode is enabled or disabled.

**command:** `tortilla strict set <mode>`

Sets strict mode. Provided mode must be either a truthy value (e.g. `1`, `true`) or a falsy value (`0`, `false`).

## License

MIT
