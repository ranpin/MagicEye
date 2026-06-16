function filePathToBase64(filePath) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    fs.readFile({
      filePath: filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data),
      fail: (err) => reject(err)
    })
  })
}

function base64ToFilePath(base64Str) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/magiceye_effect_${Date.now()}.png`
    fs.writeFile({
      filePath: filePath,
      data: base64Str,
      encoding: 'base64',
      success: () => resolve(filePath),
      fail: (err) => reject(err)
    })
  })
}

module.exports = { filePathToBase64, base64ToFilePath }
