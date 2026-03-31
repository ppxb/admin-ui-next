import type { AlovaInstanceType } from '#/utils/http'

import 'alova'

/**
 * 接口请求 message 的提示方式
 */
export type MessageType = 'message' | 'modal' | 'notification' | 'none'

type GetType = AlovaInstanceType['Get']
type PostType = AlovaInstanceType['Post']
type PutType = AlovaInstanceType['Put']
type DeleteType = AlovaInstanceType['Delete']

/**
 * 拓展 Meta
 */
export type AlovaMeta = {}

declare module 'alova' {
  export interface AlovaCustomTypes {
    meta: AlovaMeta
  }

  /**
   * 添加 withMessage 方法，用于 success 弹窗
   */
  interface Alova {
    get: GetType
    post: PostType
    put: PutType
    delete: DeleteType
    getWithMsg: GetType
    postWithMsg: PostType
    putWithMsg: PutType
    deleteWithMsg: DeleteType
  }
}

/**
 * 拓展 axios 的请求配置
 */
declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * 是否需要对请求体进行加密
     */
    encrypt?: boolean

    /**
     * 错误弹窗类型
     */
    errorMessageMode?: MessageType

    /**
     * 是否返回原生 axios 响应
     */
    isReturnNativeResponse?: boolean
    /**
     * 是否需要转换响应（即只获取 {code, msg, data} 中的 data）
     */
    isTransformResponse?: boolean

    /**
     * 接口请求成功时的提示方式
     */
    successMessageMode?: MessageType

    /**
     * 是否在请求头中添加 token
     */
    withToken?: boolean
  }
}
