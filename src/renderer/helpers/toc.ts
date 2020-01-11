import { localStorage as LocalStorage } from '../../local-storage';
import { Renderer } from '../index';

// TODO: Support internationalization, and support other TOC flavors other than for GitHub's Markdown.

interface IStep {
  title: string;
  url: string;
  children?: IStep[];
}

const generateAnchor = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/ /g, '-');

const generateURL = (title: string, superstep: number) => `.tortilla/manuals/views/step${superstep}.md#${generateAnchor(title)}`;

const extractChildren = (slice: string[], superstep: number) => {
  const filterNonSiblings = slice.filter(title => new RegExp(`^Step ${superstep}\.[0-9]+:`).test(title));

  return filterNonSiblings
    .map((title) => ({
      title,
      url: generateURL(title, superstep)
    }))
    .reverse();
};

const parseLog = (logs: string[]) => {
  const results: IStep[] = [];

  logs.forEach((title, index) => {

    const match = title.match(/^Step (\d+):/);

    if (match) {
      const superstep = Number(match[1]);

      results.push({
        title,
        url: generateURL(title, superstep),
        children: extractChildren(logs.slice(index + 1), superstep)
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
