import { LoaderUtils } from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { readModelAsset } from './model-cache'

export class CachedModelLoader extends GLTFLoader {
  override load(url: string, onLoad: (model: GLTF) => void, _onProgress?: (event: ProgressEvent) => void, onError?: (error: unknown) => void): void {
    this.setMeshoptDecoder(MeshoptDecoder)
    this.manager.itemStart(url)
    void readModelAsset(url).then(buffer => this.parseAsync(buffer, this.resourcePath || LoaderUtils.extractUrlBase(url))).then(model => {
      onLoad(model)
      this.manager.itemEnd(url)
    }).catch(error => {
      onError?.(error)
      this.manager.itemError(url)
      this.manager.itemEnd(url)
    })
  }
}
