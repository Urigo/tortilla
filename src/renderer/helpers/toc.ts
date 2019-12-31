import { Manual } from '../../manual';
import { Renderer } from '../index';

export const LOG_SEPARATOR = ' -|- ';

interface IStep {
  title: string;
  url: string;
  children?: IStep[];
}

type HistoryArray = Array<[string, string]>;

const generateAnchor = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/ /g, '-');

const generateURL = (title: string, superstep: number) => `.tortilla/manuals/views/step${superstep}.md#${generateAnchor(title)}`;

const extractChildren = (slice: HistoryArray, superstep: number) => {
  const filterNonSiblings = slice.filter(([hash, title]) => {
    console.log(title);

    return new RegExp(`^Step ${superstep}\.[0-1]+:`).test(title);
  });

  return filterNonSiblings
    .map(([hash, title]) => ({
      title,
      url: generateURL(title, superstep)
    }))
    .reverse();
};

const parseLog = (logs: string[]) => {
  const split = logs.map(log => log.split(LOG_SEPARATOR)) as HistoryArray;

  const results: IStep[] = [];

  split.forEach(([hash, title], index) => {
    const match = title.match(/^Step (\d+):/);

    if (match) {
      const superstep = Number(match[1]);

      results.push({
        title,
        url: generateURL(title, superstep),
        children: extractChildren(split.slice(index + 1), superstep)
      });
    }
  });

  return results.reverse();
};

Renderer.registerHelper('toc', () => {
  const parsed = parseLog(Manual.history);

  console.log(JSON.stringify(parsed, null, 4));

  return Renderer.renderTemplateFile('toc', {
    steps: parsed
  });
});
