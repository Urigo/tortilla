import { localStorage as LocalStorage } from '../../local-storage';
import { Renderer } from '../index';

/**
 * Must insert second-level headers for sub-steps manually for now, with the same text present on the commit or the
 * Table of Contents item, so the "#" anchors match exactly. Tried to mimic GitHub "#" anchor generation as best
 * as possible but there might be some divergences there at some point, specially if the titles get too long.
 *
 * TODO: Find work-around for anchor consistency.
 * TODO: Internationalization support.
 * TODO: Other flavors of TOC/Anchor generation besides GitHub.
 */

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
  return slice
    .filter(title => new RegExp(`^Step ${superstep}\.[0-9]+:`).test(title))
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
