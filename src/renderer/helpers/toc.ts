import { Git } from '../../git';
import { History } from '../../manual';
import { Renderer } from '../index';

interface IStep {
  title: string
  url: string
  children?: IStep[]
}

Renderer.registerHelper('toc', (options) => {
  const hash = options.hash;

  const cwd = Git.getCWD(hash.module);

  // const history = Git(['--no-pager', 'log', '--format="%h | %s"', '--reverse'], { cwd }).split('\n');

  console.log(History);

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
    ] as IStep[]
  })
});