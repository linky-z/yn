import { addAction } from './shortcut'
import { getLogger } from './utils'
import Markdown from 'markdown-it'

export type HookType = 'ON_STARTUP'
  | 'ON_VIEW_ELEMENT_CLICK'
  | 'ON_VIEW_KEY_DOWN'
  | 'ON_VIEW_RENDER'
  | 'ON_VIEW_RENDERED'
  | 'ON_VIEW_MOUNTED'
  | 'ON_VIEW_FILE_CHANGE'
  | 'ON_VIEW_BEFORE_CONVERT'
  | 'ON_TREE_NODE_SELECT'

export interface Plugin {
  name: string;
  register?: (ctx: Ctx) => void;
}

type HookFun = (...args: any[]) => boolean | void | Promise<boolean | void>

const logger = getLogger('plugin')

const plugins: {[name: string]: Plugin} = {}

const hooks: { [key in HookType]?: {fun: HookFun; once: boolean}[] } = {}

const markdownItPlugins: {plugin: any; params: any}[] = []

const ctx = {
  registerShortcutAction (name: string, keys: (string | number)[]) {
    addAction(name, keys)
  },
  registerHook: (type: HookType, fun: HookFun, once = false) => {
    if (Array.isArray(hooks[type])) {
      hooks[type] = [...hooks[type]!!, { fun, once }]
    } else {
      hooks[type] = [{ fun, once }]
    }
  },
  removeHook: (type: HookType, fun: HookFun) => {
    if (Array.isArray(hooks[type])) {
      hooks[type] = hooks[type]!!.filter(x => x.fun !== fun)
    }
  },
  registerMarkdownItPlugin: (plugin: (md: Markdown, ...args: any) => void, params?: any) => {
    markdownItPlugins.push({ plugin, params })
  }
}

export type Ctx = typeof ctx;

export const register = (plugin: Plugin) => {
  logger.debug('register', plugin)
  plugins[plugin.name] = plugin
  plugin.register && plugin.register(ctx)
}

export const init = () => {
  logger.debug('init')

  const localPlugins = [
    require('@/plugins/markdown-source-line'),
    require('@/plugins/markdown-toc'),
    require('@/plugins/markdown-code'),
    require('@/plugins/markdown-link'),
    require('@/plugins/code-line-number'),
    require('@/plugins/transform-img-out-link'),
    require('@/plugins/copy-text'),
    require('@/plugins/table-cell-edit'),
    require('@/plugins/switch-todo'),
    require('@/plugins/run-code'),
    require('@/plugins/plantuml'),
    require('@/plugins/drawio'),
    require('@/plugins/mind-map'),
    require('@/plugins/mermaid'),
    require('@/plugins/applet'),
    require('@/plugins/echarts'),
  ]

  localPlugins.forEach((plugin) => {
    if (plugin.__esModule && plugin.default) {
      register(plugin.default)
    } else {
      register(plugin)
    }
  })
}

export const triggerHook = async (type: HookType, ...args: any[]) => {
  logger.debug('triggerHook', type, args)
  for (const { fun, once } of (hooks[type] || [])) {
    once && ctx.removeHook(type, fun)
    if (await fun(...args)) {
      return true
    }
  }

  return false
}

export const getMarkdownItPlugins = () => markdownItPlugins

init()