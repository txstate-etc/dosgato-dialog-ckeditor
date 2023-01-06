import type { Asset, ChooserType, Client, Folder, Page, Source, AnyItem } from '@dosgato/dialog'
import { randomid } from 'txstate-utils'

interface StoredAsset extends Omit<Asset, 'source'> {}
interface RootFolder {
  children?: (StoredAsset | FolderWithChildren)[]
  acceptsUpload?: boolean
}
interface RootPage {
  children?: PageWithChildren[]
}
interface FolderWithChildren extends Omit<Folder, 'source'> {
  children?: (StoredAsset | FolderWithChildren)[]
}
interface PageWithChildren extends Omit<Page, 'source'> {
  children?: PageWithChildren[]
}

type AnyStoredItem = StoredAsset | FolderWithChildren | PageWithChildren

const assets: Record<string, RootFolder | RootPage> = {
  Assets: {
    children: [
      {
        type: 'folder',
        id: 'folder-1',
        name: 'biology',
        path: '/biology',
        url: '/assets/biology',
        acceptsUpload: true,
        hasChildren: true,
        children: [
          {
            type: 'folder',
            id: 'folder-4',
            name: 'evolutionary',
            path: '/biology/evolutionary',
            url: '/assets/biology/evolutionary',
            acceptsUpload: false,
            hasChildren: true,
            children: [
              { type: 'asset', id: 'asset-3', path: '/biology/evolutionary/missinglink.png', name: 'missinglink.png', mime: 'image/png', bytes: 196672, url: '/demo-full.png', image: { width: 909, height: 1114, thumbnailUrl: '/demo-thumb.png' } }
            ]
          },
          { type: 'folder', id: 'folder-5', name: 'humananatomy', path: '/biology/humananatomy', url: '/assets/biology/humananatomy', acceptsUpload: false, hasChildren: false }
        ]
      },
      {
        type: 'folder',
        id: 'folder-2',
        name: 'chemistry',
        path: '/chemistry',
        url: '/assets/chemistry',
        acceptsUpload: true,
        hasChildren: true,
        children: [
          { type: 'folder', id: 'folder-6', name: 'organic', path: '/chemistry/organic', url: '/assets/chemistry/organic', acceptsUpload: true, hasChildren: false }
        ]
      },
      {
        type: 'folder',
        id: 'folder-3',
        name: 'physics',
        path: '/physics',
        url: '/assets/physics',
        acceptsUpload: true,
        hasChildren: true,
        children: [
          { type: 'asset', id: 'asset-1', path: '/physics/cannondiagram.png', name: 'cannondiagram.png', mime: 'image/png', bytes: 196672, url: '/demo-full.png', image: { width: 909, height: 1114, thumbnailUrl: '/demo-thumb.png' } },
          { type: 'asset', id: 'asset-2', path: '/physics/modernphysics.pdf', name: 'modernphysics.pdf', mime: 'application/pdf', bytes: 1264, url: '/blankpdf.pdf' },
          { type: 'asset', id: 'asset-3', path: '/physics/bobcat.jpg', name: 'bobcat.jpg', mime: 'image/jpeg', bytes: 3793056, url: '/bobcat.jpg', image: { width: 6016, height: 4016, thumbnailUrl: '/bobcat-thumbnail.jpg' } }
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
        path: '/human-resources',
        name: 'human-resources',
        url: 'https://example.org/human-resources.html',
        title: 'Human Resources',
        hasChildren: true,
        children: [
          {
            type: 'page',
            id: 'page-5',
            path: '/human-resources/about',
            name: 'about',
            url: 'https://example.org/human-resources/about.html',
            title: 'About Us',
            hasChildren: false
          },
          {
            type: 'page',
            id: 'page-6',
            path: '/human-resources/resources',
            name: 'resources',
            url: 'https://example.org/human-resources/resources.html',
            title: 'Forms & Other Resources',
            hasChildren: false
          }
        ]
      },
      {
        type: 'page',
        id: 'page-2',
        path: '/history',
        name: 'history',
        url: 'https://example.org/history.html',
        title: 'Department of History',
        hasChildren: false
      },
      {
        type: 'page',
        id: 'page-3',
        path: '/math',
        name: 'math',
        url: 'https://example.org/math.html',
        title: 'Department of Mathematics',
        hasChildren: false
      },
      {
        type: 'page',
        id: 'page-4',
        path: '/vpit',
        name: 'vpit',
        url: 'https://example.org/vpit.html',
        title: 'Information Technology',
        hasChildren: false
      }
    ]
  }
}

class DemoChooserAPI implements Client {
  async getSources (type: ChooserType) {
    if (type === 'asset') return [{ type: 'asset', name: 'Assets' }, { type: 'asset', name: 'Canto' }] as Source[]
    return [{ type: 'page', name: 'Pages' }] as Source[]
  }

  findFolder (source: string, path: string): RootFolder | RootPage | FolderWithChildren | PageWithChildren {
    if (path === '/') return assets[source]
    const parts = path.substring(1).split('/')
    let folders = assets[source].children
    let folder: AnyStoredItem | undefined
    for (const part of parts) {
      folder = (folders as AnyStoredItem[]).find(f => f.name === part)
      if (!folder) throw new Error(`path ${path} not found in source ${source}`)
      if (folder.type === 'asset') throw new Error(`path ${path} refers to an asset but expected a folder`)
      folders = folder.children ?? []
    }
    return folder as FolderWithChildren | PageWithChildren
  }

  collectItems (item: StoredAsset | FolderWithChildren | PageWithChildren | RootPage | RootFolder, source: string): AnyItem[] {
    const ret: AnyItem[] = []
    if ('type' in item) ret.push({ ...item, source })
    if ('children' in item && item.children?.length) {
      for (const f of item.children) {
        ret.push(...this.collectItems(f, source))
      }
    }
    return ret
  }

  async getChildren (source: string, path: string) {
    const folder = this.findFolder(source, path)
    return folder.children?.map(c => ({ ...c, source })) as AnyItem[] ?? []
  }

  async find (source: string, path: string, searchstring: string) {
    const folder = this.findFolder(source, path)
    const items = this.collectItems(folder, source)
    const search = searchstring.toLocaleLowerCase()
    return items.filter(a => a.name.toLocaleLowerCase().includes(search))
  }

  async findById (id: string): Promise<AnyItem | undefined> {
    for (const [key, rootfolder] of Object.entries(assets)) {
      const found = this.collectItems(rootfolder, key).find(a => a.id === id)
      if (found) return found
    }
    return undefined
  }

  async findByUrl (url: string) {
    for (const [source, rootfolder] of Object.entries(assets)) {
      const found = this.collectItems(rootfolder, source).find(a => 'url' in a && a.url === url)
      if (found) return found
    }
    return undefined
  }

  async upload (source: string, path: string, files: FileList) {
    const folder = this.findFolder(source, path) as RootFolder | FolderWithChildren
    if (!folder?.acceptsUpload) throw new Error('User may not upload to this folder')
    folder.children ??= []
    for (const file of Array.from(files)) {
      const isImage = file.type.startsWith('image')
      const asset: StoredAsset = { type: 'asset', id: randomid(), path, name: file.name, mime: isImage ? 'image/png' : 'application/pdf', bytes: isImage ? 196672 : 1264, url: isImage ? '/static/demo-full.png' : '/static/blankpdf.pdf' }
      if (isImage) {
        asset.image = {
          width: 909,
          height: 1114,
          thumbnailUrl: '/demo-thumb.png'
        }
      }
      folder.children.push(asset)
    }
  }
}

export const demoChooserAPI = new DemoChooserAPI()
