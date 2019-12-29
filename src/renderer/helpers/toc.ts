import { Renderer } from '../index';

interface Step {
  title: string
  url: string
  children?: Step[]
}

Renderer.registerHelper('toc', (options) => {
  return Renderer.renderTemplateFile('toc', {
    steps: [
      {
        title: 'Step 1: Create Project',
        url: '.tortilla/manual/views/step1.md',
        children: [
          {
            title: 'Step 1.1: Open Terminal',
            url: '.tortilla/manual/views/step1.md#step-11-open-terminal'
          },
          {
            title: 'Step 1.2: Type Commands',
            url: '.tortilla/manual/views/step1.md#step-12-type-commands'
          }
        ]
      }
    ] as Step[]
  })
});