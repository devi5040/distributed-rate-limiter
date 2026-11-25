local leakRate = tonumber(ARGV[1]) or 0
local capacity = tonumber(ARGV[2]) or 0
local cost = tonumber(ARGV[3])

local now = redis.call("TIME")
local nowSeconds = tonumber(now[1])
local microSeconds  = tonumber(now[2])

local currentTime = nowSeconds + microSeconds/1000000

local existing = redis.call("HMGET", KEYS[1], 'level', 'lastDrain')
local existingLevel = tonumber(existing[1]) or 0
local existingLastDrain = tonumber(existing[2]) or currentTime

local elapsed = currentTime - tonumber(existingLastDrain)

local leaked = leakRate * elapsed
local newLevel = math.max(0, existingLevel - leaked)

local function drainTime(amount)
    if leakRate <=0 then return 0 end
    return math.ceil(amount/leakRate)
end

if(newLevel + cost >capacity) then
    return {0, 0, drainTime(newLevel + cost - capacity)}
end

redis.call("HSET", KEYS[1], 'level', newLevel+cost, 'lastDrain', currentTime)

local ttl = (leakRate>0) and (math.ceil(capacity/leakRate) + 1) or 3600
redis.call("EXPIRE", KEYS[1], ttl)

return {1, math.floor(capacity-newLevel-cost), drainTime(newLevel+cost)}