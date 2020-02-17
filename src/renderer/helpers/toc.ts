import { localStorage as LocalStorage } from '../../local-storage';
import { Renderer } from '../index';

/**
 * TODO: Internationalization support.
 */

interface IStep {
  title: string;
  url: string;
}

const generateURL = (superstep: number) => `.tortilla/manuals/views/step${superstep}.md`;

const parseLog = (logs: string[]) => {
  const results: IStep[] = [];

  logs.forEach(title => {

    const match = title.match(/^Step (\d+):/);

    if (match) {
      const superstep = Number(match[1]);

      results.push({
        title,
        url: generateURL(superstep)
      });
    }
  });

  return results.reverse();
};

Renderer.registerHelper('toc', () => {
  const history = LocalStorage.getItem('TABLE_OF_CONTENTS');

  if (!history) {
    console.error('No table of contents found.');

    return '';
  }

  const parsed = parseLog(JSON.parse(history));

  return Renderer.renderTemplateFile('toc', {
    steps: parsed
  });
});
