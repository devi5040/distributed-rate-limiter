local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])

local time = redis.call("TIME")
local nowSeconds = tonumber(time[1])
local microSeconds = tonumber(time[2])

local windowIndex = math.floor((nowSeconds+microSeconds/1000000)/windowSeconds)
local currentKey = KEYS[1]..":"..windowIndex
local previousKey = KEYS[1]..":"..(windowIndex-1)

local elapsedFraction = ((nowSeconds+microSeconds/1000000)%windowSeconds)/windowSeconds

local currentCount = tonumber(redis.call("GET", currentKey)) or 0

local previousCount = tonumber(redis.call("GET", previousKey)) or 0

local estimatedCount = previousCount * (1-elapsedFraction) + currentCount

local resetIn = math.ceil(windowSeconds * (1 - elapsedFraction))

if estimatedCount >= limit then
    return {0,0,resetIn}
end

redis.call('SET', currentKey, currentCount+1)
redis.call("EXPIRE", currentKey, 2*windowSeconds)

return {1, math.floor(limit-estimatedCount-1), resetIn}