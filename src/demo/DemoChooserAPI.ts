import type { AnyUIItem, Asset, ChooserType, Client, Folder, Page, Source } from '@txstate-mws/dosgato-dialog'
import { filterAsync, randomid } from 'txstate-utils'

interface RootFolder {
  children?: (Asset|FolderWithChildren)[]
  acceptsUpload?: boolean
}
interface RootPage {
  children?: PageWithChildren[]
}
interface FolderWithChildren extends Folder {
  children?: (Asset|FolderWithChildren)[]
}
interface PageWithChildren extends Page {
  children?: PageWithChildren[]
}

type AnyItem = Asset|FolderWithChildren|PageWithChildren

const assets: Record<string, RootFolder|RootPage> = {
  Assets: {
    children: [
      {
        type: 'folder',
        id: 'folder-1',
        name: 'biology',
        path: '/',
        acceptsUpload: true,
        children: [
          {
            type: 'folder',
            id: 'folder-4',
            name: 'evolutionary',
            path: '/biology',
            acceptsUpload: false,
            children: [
              { type: 'asset', id: 'asset-3', path: '/biology/evolutionary', name: 'missinglink.png', mime: 'image/png', bytes: 196672, url: '/static/demo-full.png', image: { width: 909, height: 1114, thumbnailUrl: '/static/demo-thumb.png' } }
            ]
          },
          { type: 'folder', id: 'folder-5', name: 'humananatomy', path: '/biology', acceptsUpload: false }
        ]
      },
      {
        type: 'folder',
        id: 'folder-2',
        name: 'chemistry',
        path: '/',
        acceptsUpload: true,
        children: [
          { type: 'folder', id: 'folder-6', name: 'organic', path: '/chemistry', acceptsUpload: true }
        ]
      },
      {
        type: 'folder',
        id: 'folder-3',
        name: 'physics',
        path: '/',
        acceptsUpload: true,
        children: [
          { type: 'asset', id: 'asset-1', path: '/physics', name: 'cannondiagram.png', mime: 'image/png', bytes: 196672, url: '/static/demo-full.png', image: { width: 909, height: 1114, thumbnailUrl: '/static/demo-thumb.png' } },
          { type: 'asset', id: 'asset-2', path: '/physics', name: 'modernphysics.pdf', mime: 'application/pdf', bytes: 1264, url: '/static/blankpdf.pdf' }
        ]
      }
    ]
  },
  Canto: {
    children: []
  },
  Pages: {
    children: [
      {
        type: 'page',
        id: 'page-1',
        path: '/',
        name: 'human-resources',
        url: 'https://example.org/human-resources.html',
        title: 'Human Resources',
        children: [
          {
            type: 'page',
            id: 'page-5',
            path: '/human-resources',
            name: 'about',
            url: 'https://example.org/human-resources/about.html',
            title: 'About Us'
          },
          {
            type: 'page',
            id: 'page-6',
            path: '/human-resources',
            name: 'resources',
            url: 'https://example.org/human-resources/resources.html',
            title: 'Forms & Other Resources'
          }
        ]
      },
      {
        type: 'page',
        id: 'page-2',
        path: '/',
        name: 'history',
        url: 'https://example.org/history.html',
        title: 'Department of History'
      },
      {
        type: 'page',
        id: 'page-3',
        path: '/',
        name: 'math',
        url: 'https://example.org/math.html',
        title: 'Department of Mathematics'
      },
      {
        type: 'page',
        id: 'page-4',
        path: '/',
        name: 'vpit',
        url: 'https://example.org/vpit.html',
        title: 'Information Technology'
      }
    ]
  }
}

class DemoChooserAPI implements Client {
  async getSources (type: ChooserType) {
    if (type === 'asset') return [{ type: 'asset', name: 'Assets' }, { type: 'asset', name: 'Canto' }] as Source[]
    return [{ type: 'page', name: 'Pages' }] as Source[]
  }

  findFolder (source: string, path: string): RootFolder|RootPage|FolderWithChildren|PageWithChildren {
    if (path === '/') return assets[source]
    const parts = path.substring(1).split('/')
    let folders = assets[source].children
    let folder: AnyItem
    for (const part of parts) {
      folder = (folders as AnyItem[]).find(f => f.name === part)
      if (!folder) throw new Error(`path ${path} not found in source ${source}`)
      if (folder.type === 'asset') throw new Error(`path ${path} refers to an asset but expected a folder`)
      folders = folder.children ?? []
    }
    return folder as FolderWithChildren|PageWithChildren
  }

  collectItems (item: Asset|FolderWithChildren|PageWithChildren|RootPage|RootFolder) {
    const ret = []
    if ('type' in item) ret.push(item)
    if ('children' in item && item.children.length) {
      for (const f of item.children) {
        ret.push(...this.collectItems(f))
      }
    }
    return ret
  }

  async getChildren (source: string, path: string, filter: (assetOrFolder: Asset | Folder) => boolean | Promise<boolean>) {
    const folder = this.findFolder(source, path)
    return await filterAsync(folder.children as AnyItem[] ?? [], filter)
  }

  async find (source: string, path: string, searchstring: string, filter: (item: AnyUIItem) => boolean | Promise<boolean>) {
    const folder = this.findFolder(source, path)
    const items = this.collectItems(folder)
    const search = searchstring.toLocaleLowerCase()
    return await filterAsync(items.filter(a => a.name.toLocaleLowerCase().includes(search)), filter)
  }

  async findById (id: string) {
    for (const rootfolder of Object.values(assets)) {
      const found = this.collectItems(rootfolder).find(a => a.id === id)
      if (found) return found
    }
    throw new Error('Asset or Folder ID not found.')
  }

  async findByUrl (url: string) {
    for (const rootfolder of Object.values(assets)) {
      const found = this.collectItems(rootfolder).find(a => a.url === url)
      if (found) return found
    }
    throw new Error('Asset or Folder ID not found.')
  }

  async upload (source: string, path: string, files: FileList) {
    const folder = this.findFolder(source, path) as RootFolder|FolderWithChildren
    if (!folder?.acceptsUpload) throw new Error('User may not upload to this folder')
    folder.children ??= []
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image')
      const asset: Asset = { type: 'asset', id: randomid(), path, name: file.name, mime: isImage ? 'image/png' : 'application/pdf', bytes: isImage ? 196672 : 1264, url: isImage ? '/static/demo-full.png' : '/static/blankpdf.pdf' }
      if (isImage) {
        asset.image = {
          width: 909,
          height: 1114,
          thumbnailUrl: '/static/demo-thumb.png'
        }
      }
      folder.children.push(asset)
    }
  }
}

export const demoChooserAPI = new DemoChooserAPI()
