# Tortilla

Tortilla is a project skeleton for a newly created angular-server.com tutorial. This skeleton contains some handy git-helpers which will help us maintain our commits history nice and clean and will make sure that our project is suitable for a tutorial deployment.

This `README.md` file will be used as the intro page once the tutorial is deployed, so make sure to edit it according to your will. If your'e not familiar with the basic rules that you should follow when working on this project, be sure to go through the following guidelines.

### Commits

The project should have a very specific form of commits list history. Let's first observe how a valid commits list history should look like and then we will go through it (Tags are preceded by #):

    Step 2: Add todo-list # step2
    Step 2.3: Add todo-list controller
    Step 2.2: Add todo-list view
    Step 2.1: Add todo-list model
    Step 1: Bundling # step1
    Step 1.3: Install the necessary packages for webpack's build
    Step 1.2: Add webpack build to gulp tasks
    Step 1.1: Create a basic webpack config
    Create initial project # root

As you can see, each commit should present a single step in the tutorial, it means that its message should have the following template:

    Step (step number): (step description)

Some of the commits represent a [sub-step](#sub-step) (e.g. step 1.1, 1.2 etc) and some of the represent a [super-step](#super-step) (e.g. step 1, 2 etc), together they form a whole step. Note that the only exception is the initial commit whos message can be whatever you'd like, the rest of the commits **must** follow these rules, otherwise deployment will fail.

#### Sub Step

A sub-step is a small portion of the whole step, each sub-step should usually represent a small change which should be followed by an explenation in the tutorial. Sub-steps should be sorted by their chronological order, sub-steps which assemble the same step should have the same super index, and an consecutive sub index seperated by a period (e.g. 1.1, 1.2 etc). It's recommended to modify only a single file in a sub-step, otherwise we might encounter some complications when using the [step differentiation](#super-step) markdown helper.

#### Super Step

A super-step should **always** come at the end of each step, it should contain a single index and it should be tagged by its step name (e.g. super-step 1 should be tagged "step1", super-step 2 should be tagged "step2" etc). The super-step should add an instruction file on how to create the current step. The instruction file is a somple markdown file which should be located under the `steps` directory and its name should be `step(step index).md` (The step index **must** be the same index as the current step's, otherwise deployment will fail). The instruction file can contain whatever you desire, and in addition you will be provided with the following template helpers:

- {{#diff oldStep newStep}} - Show the differences between `oldStep` and `newStep` using [git's diff algorithm](git-scm.com/docs/git-diff).
- {{#step}} - Retreive the number of the current step.

### Git Helpers

You've probably noticed that the rules for a valid tutorial project are very strict. This is where the git-helpers kicks in. Instead of having a rough time managing the steps list, here are some kick-ass helpers which will make your life way easier:

#### Push Step

$ npm run step -- push --message="step message"

Push a new step to the top of the stack with the provided message. If you would like to add a new step in the middle of the stack, first use the [step editing](#edit-step) helper, and then push a new step to the top of the stack.

#### Pop Step

$ npm run step -- pop

Pop the last step from the top of the stack. If you would like to remove a step from the middle of the stack, first use the [step editing](#edit-step) helper, and then pop the step from the top of the stack.

#### Edit Step

$ npm run step -- edit --step="step number"

Edit the provided step. This will get you into rebase mode, so once you've finished editing your step, just type `git rebase --continue` and let git do its magic. You can add, remove and tag new steps during editing without worrying about the up-comming commits, this helper is smart enough to adjust their content and messages based on your actions.

#### Reword Step

$ npm run step -- reword --step="step number" --message="step message"

Replace the provided step's message with the provided step.

#### Tag Step

$ npm run step -- tag --step="step number"

Add a new super-step and finish the current step. This will add a new step tag to your commits list and it will initialize an empty instructions markdown file. If you would like to edit the instruction file, simply us the [step editing](#edit-step) helper and ammend you changes to the recent commit.