const _axios = require('axios')
const params = require('./config')
const xlsx = require("node-xlsx")
const fs = require("fs")

const HttpsProxyAgent = require("https-proxy-agent")
const httpsAgent = new HttpsProxyAgent(`http://127.0.0.1:10802`)
const axios = _axios.create({proxy: false, httpsAgent})


const list = [
  {
    name: "sheet",
    data: [
      ["data1", "data2", "data3"],
      ["data1", "data2", "data3"],
      ["data1", "data2", "data3"],
    ],
  },
]

const buffer = xlsx.build(list)
fs.writeFile("testFile.xlsx", buffer, (err) => {
  if (err) {
    console.log(err, "保存excel出错")
  } else {
    console.log("写入excel成功!!!")
  }
})


const getProxyAddr = (data) => {
  return '0x' + data.substring(26, 26 + 40)
}

const parseTime = (time, cFormat) => {
  if (!time || arguments.length === 0) {
    return null
  }
  const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}'
  let date
  if (typeof time === 'object') {
    date = time
  } else {
    if ((typeof time === 'string')) {
      if ((/^[0-9]+$/.test(time))) {
        // support "1548221490638"
        time = parseInt(time)
      } else {
        // support safari
        // https://stackoverflow.com/questions/4310953/invalid-date-in-safari
        time = time.replace(new RegExp(/-/gm), '/')
      }
    }

    if ((typeof time === 'number') && (time.toString().length === 10)) {
      time = time * 1000
    }
    date = new Date(time)
  }
  const formatObj = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay()
  }
  const time_str = format.replace(/{([ymdhisa])+}/g, (result, key) => {
    const value = formatObj[key]
    // Note: getDay() returns 0 on Sunday
    if (key === 'a') {
      return ['日', '一', '二', '三', '四', '五', '六'][value]
    }
    return value.toString().padStart(2, '0')
  })
  return time_str
}

const getCurrentTime = (time) => {
  return parseTime(Number(time), '{y}-{m}-{d} {h}:{i}:{s}')
}

const getSafeInfo = (data) => {
  const str = data.substring(2)
  const threshold = str.substring(64, 64 + 64)
  const ownersLength = str.substring(256, 256 + 64)
  const ownersData = str.substring(320)
  const len = ownersData.length / 64
  const ownersList = []
  for(let i = 0; i < len; i++) {
    ownersList.push('0x' + ownersData.substring(i * 64, (i + 1) * 64).substring(24))
  }
  return {
    owners: ownersList.join(','),
    threshold: threshold,
    ownersLengh: ownersLength,
  }
}


;(async () => {
  const getSafeOwners = (safeAddr) => {
    const res = axios({
      method: 'get',
      url: 'https://api.etherscan.io/api',
      params: {
        module: 'logs',
        action: 'getLogs',
        fromBlock: params.fromBlock,
        toBlock: params.toBlock,
        address: safeAddr,
        topic0: '0x141df868a6331af528e38c83b7aa03edc19be66e37ae67f9285bf4f8e3c6a1a8',
        topic0_1_opr: 'and',
        topic1: '0x000000000000000000000000a6b71e26c5e0845f74c812102ca7114b6a896ab2',
        page: params.page,
        offset: params.offset,
        apikey: params.APIKey
      }
    })
    return res
  }

  const getSafeAddrr = () => {
    const res = axios({
      method: 'get',
      url: 'https://api.etherscan.io/api',
      params: {
        module: 'logs',
        action: 'getLogs',
        fromBlock: params.fromBlock,
        toBlock: params.toBlock,
        address: params.address,
        topic0: '0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235',
        page: params.page,
        offset: params.offset,
        apikey: params.APIKey
      }
    })
    return res
  }

  const res = await getSafeAddrr()
  if (res && res.data && res.data.status === '1') {
    const data = res.data.result
    const mapData = data.map(item => getProxyAddr(item.data)).reverse()
    const tableList = []
    for(let i = 0; i < mapData.length; i++) {
      const result = await getSafeOwners(mapData[i])
      if (result && result.data && result.data.status === '1') {
        const ownersData = result.data.result
        const ownerMapsData = ownersData.map(item => {
          const { owners, threshold, ownersLengh} = getSafeInfo(item.data)
          return {
            time: getCurrentTime(item.timeStamp),
            owners,
            threshold,
            ownersLengh,
            transactionHash: item.transactionHash
          }
        })
        tableList.push(...ownerMapsData)
      }
    }
    console.log('🚀 ~ file: index.js ~ line 126 ~ ; ~ tableList', tableList)
  }
  
})()