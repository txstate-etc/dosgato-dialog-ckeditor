/* eslint-disable @typescript-eslint/consistent-type-assertions */
import type { Asset, ChooserType, Client, Folder, Page, Source, AnyItem, TypedTreeItem } from '@dosgato/dialog'
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

type PageTreeTypes = RootPage | PageWithChildren
type FolderTreeTypes = RootFolder | FolderWithChildren | PageTreeTypes

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
        childCount: 2,
        children: [
          {
            type: 'folder',
            id: 'folder-4',
            name: 'evolutionary',
            path: '/biology/evolutionary',
            url: '/assets/biology/evolutionary',
            acceptsUpload: false,
            hasChildren: true,
            childCount: 1,
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
        childCount: 1,
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
        childCount: 4,
        children: [
          { type: 'asset', id: 'asset-1', path: '/physics/cannondiagram.png', name: 'cannondiagram.png', mime: 'image/png', bytes: 196672, url: '/demo-full.png', image: { width: 909, height: 1114, thumbnailUrl: '/demo-thumb.png' } },
          { type: 'asset', id: 'asset-2', path: '/physics/modernphysics.pdf', name: 'modernphysics.pdf', mime: 'application/pdf', bytes: 1264, url: '/blankpdf.pdf' },
          { type: 'asset', id: 'asset-4', path: '/physics/bobcat.jpg', name: 'bobcat.jpg', mime: 'image/jpeg', bytes: 3793056, url: '/bobcat.jpg', image: { width: 6016, height: 4016, thumbnailUrl: '/bobcat-thumbnail.jpg' } },
          { type: 'asset', id: 'asset-5', path: '/physics/building.jpg', name: 'building.jpg', mime: 'image/jpeg', bytes: 1050369, url: '/building.jpg', image: { width: 2500, height: 3750, thumbnailUrl: '/building-thumbnail.jpg' } }
        ]
      }
    ]
  } as RootFolder,
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
  } as RootPage
}

class DemoChooserAPI implements Client {
  async getSources (type: ChooserType) {
    if (type === 'asset') return [{ type: 'asset', name: 'Assets' }, { type: 'asset', name: 'Canto' }] as Source[]
    return [{ type: 'page', name: 'Pages' }] as Source[]
  }

  /** If `path` is '/' returns the RootFolder or RootPage associated with `source`, else it traverses `path` camparing child
   * object names to the parts of the path looking for the FolderWithChildren or PageWithChildren object that corresponds
   * to `path` and returns any associated folder type objects found.
   * @throws 'path `path` not found in source `source`' if no corresponding object is found.
   * @throws 'path `path` refers to an asset but expected a folder' if the object found is not a type of folder object. */
  findFolder (source: string, path: string): FolderTreeTypes {
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

  /** Recursive function for building and returning a flat array of `item` and its recursive children
   *  having `source` appended to every resulting object as an additional property. */
  collectItems (item: StoredAsset | FolderTreeTypes, source: string): AnyItem[] {
    const ret: AnyItem[] = []
    if ('type' in item) { (item as AnyItem).source = source; ret.push(item as AnyItem) }
    if ('children' in item && item.children?.length) {
      for (const f of item.children) {
        ret.push(...this.collectItems(f, source))
      }
    }
    return ret
  }

  /** Returns any children of `path` as an AnyItem array with `source` added as a property to each child in the array.  */
  async getChildren (source: string, path: string) {
    const folder = this.findFolder(source, path)
    for (const c of folder.children ?? []) (c as AnyItem).source = source
    return folder.children as AnyItem[] ?? []
  }

  /** Goes through all the items decending from path, under source, and case insensitively checks if their name includes
   * `searchstring` - returning any items that do as an array of AnyItem.  */
  async find (source: string, path: string, searchstring: string) {
    const folder = this.findFolder(source, path)
    const items = this.collectItems(folder, source)
    const search = searchstring.toLocaleLowerCase()
    return items.filter(a => a.name.toLocaleLowerCase().includes(search))
  }

  /** Searches all items of assets, and their recursive children, for any item that has an id property matching `id`
   * and returns a reference to the first one found - else `undefined`. */
  async findById (id: string): Promise<AnyItem | undefined> {
    return await this.findBy(a => a.id === id)
  }

  /** Searches all items of assets, and their recursive children, for any item that has a url property matching `url`
   * and returns a reference to the first one found - else `undefined`. */
  async findByUrl (url: string) {
    return await this.findBy(a => 'url' in a && a.url === url)
  }

  urlToValue (url: string) {
    return JSON.stringify({ type: 'url', url })
  }

  valueToUrl (value: string) {
    try {
      return JSON.parse(value).url
    } catch {
      return undefined
    }
  }

  /** Searches all items of assets, and their recursive children, for any item that satisfies the passed in boolean
   * function and returns a reference to the first one found - else `undefined`. */
  private async findBy (fn: (a: AnyItem) => boolean) {
    for (const [source, rootfolder] of Object.entries(assets)) {
      const found = this.collectItems(rootfolder, source).find(fn)
      if (found) return found
    }
    return undefined
  }

  /** If a folder corresponds to `path` under `source` this will build StoredAsset objects from the `files` passed and simulate adding them to that folder's children in memory.
   * @throws 'User may not upload to this folder` error if that folder doesn't acceptUpload. */
  async upload (folder: TypedTreeItem<Folder>, files: File[], progress: (ratio: number) => void) {
    if (!folder?.acceptsUpload) throw new Error('User may not upload to this folder')
    folder.children ??= []
    const inc = 1 / files.length
    let ratio = 0
    for (const file of files) {
      const isImage = file.type.startsWith('image')
      const asset: StoredAsset = { type: 'asset', id: randomid(), path: folder.path + '/' + file.name, name: file.name, mime: isImage ? 'image/png' : 'application/pdf', bytes: isImage ? 196672 : 1264, url: '/static/' + file.name }
      if (isImage) {
        asset.image = {
          width: 909,
          height: 1114,
          thumbnailUrl: '/demo-thumb.png'
        }
      }
      folder.children.push(asset as any)
      folder.childCount += 1
      folder.hasChildren = true
      ratio += inc
      progress(ratio)
    }
    return folder.children
  }
}

export const demoChooserAPI = new DemoChooserAPI()
