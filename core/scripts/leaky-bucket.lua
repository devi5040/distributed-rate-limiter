local leakRate = tonumber(ARGV[1]) or 0
local capacity = tonumber(ARGV[2]) or 0
local cost = tonumber(ARGV[3])
-- windowSeconds is a flat TTL, not derived from capacity/leakRate.
-- Safe only while capacity/leakRate stays well under this value —
-- if that ratio can exceed windowSeconds, the key may expire mid-drain.
local windowSeconds = tonumber(ARGV[4]) or 3600

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

if(newLevel+cost>capacity) then
    local ttl = redis.call("TTL", KEYS[1])
    return {0, 0, ttl}
end

redis.call("HSET", KEYS[1], 'level', newLevel+cost, 'lastDrain', currentTime)
redis.call("EXPIRE", KEYS[1], windowSeconds)

local ttl = redis.call("TTL", KEYS[1])
return {1, capacity-newLevel-cost, ttl}