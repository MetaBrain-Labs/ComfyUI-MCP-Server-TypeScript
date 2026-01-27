export enum ResultCode {
  // 通用成功
  SUCCESS = 200,

  // 参数错误
  PARAM_ERROR = 401,
  // 无权限
  UNAUTHORIZED = 402,
  // 禁止访问
  FORBIDDEN = 403,
  // 无效请求
  NOT_FOUND = 404,

  // 业务异常
  BUSINESS_ERROR = 420,
  // 数据不存在
  DATA_NOT_EXIST = 421,
  // 数据已经存在
  DATA_ALREADY_EXIST = 422,
  // 不允许操作
  OPERATION_NOT_ALLOWED = 423,

  // 系统错误
  SYSTEM_ERROR = 500,
  // 超时
  TIMEOUT = 501,
  // 服务不可用
  SERVICE_UNAVAILABLE = 502,
}
