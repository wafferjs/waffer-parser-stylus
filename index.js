const fs     = require('fs-extra')
const stylus = require('stylus')
const utilus = require('utilus')
const path   = require('path')
const nib    = require('nib')

const cwd = process.cwd();

const render = async (buf, file, exporting, options) => {
  const style = stylus(`${buf}`, options)

  style.set('filename', file)
  style.set('include css', true)

  // add nib for css backward compatibility
  style.include(nib.path).import('nib')

  // add utilus for easier positioning
  utilus()(style)
  style.import('utilus')

  // add global styles
  style.include(path.join(cwd, 'styles'))

  const p = file.substr(cwd.length + 1)

  // TODO: fix exporting urls
  // TODO: add tests to url function
  // we care only about views
  if (p.startsWith('views/')) {
    const div = p.substr(6).split('/styles/');
    const view = div.shift();

    const urlfunc = function (url) {
      const Compiler = require('stylus/lib/visitor/compiler');
      const nodes    = require('stylus/lib/nodes');
      const compiler = new Compiler();

      url = url.nodes.map(function(node){
        return compiler.visit(node);
      }).join('');

      if (url.startsWith('@')) {
        if (!exp) {
          return new nodes.Literal(`url("/${view}/${url}")`);
        }

        const parsed  = path.parse(path.join(cwd, 'views', view, url.slice(1)));
        const fparsed = path.parse(this.filename);
        return new nodes.Literal(`url("${path.join(path.relative(fparsed.dir, parsed.dir), parsed.base)}")`);
      }

      return new nodes.Literal(`url("${url}")`);
    }

    urlfunc.raw = true;
    style.define('url', urlfunc);
  }


  return await new Promise((f, r) => style.render((err, css) => err ? r(err) : f(css)))
};

const parse = async (file, exporting, options) => {
  const buf = await fs.readFile(file)
  const css = await render(buf, file, exporting, options)

  return { content: css }
}

module.exports = server => {
  return { parse, ext: '.css' };
}
