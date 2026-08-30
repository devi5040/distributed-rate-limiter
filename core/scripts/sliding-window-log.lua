local limit = tonumber(ARGV[1])
local windowSeconds = tonumber(ARGV[2])
local uniqueId = ARGV[3]

local now = redis.call("TIME")
local nowSeconds = tonumber(now[1])
local nowMicro = tonumber(now[2])

redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, (nowSeconds+nowMicro/1000000)-windowSeconds)

local count = tonumber(redis.call("ZCARD", KEYS[1]))
if count>=limit then
    local ttl = redis.call("TTL", KEYS[1])
    return {0,0, ttl};
end

redis.call("ZADD", KEYS[1],nowSeconds+nowMicro/1000000 ,uniqueId.. ":" ..nowMicro)
redis.call("EXPIRE", KEYS[1], windowSeconds)

local ttl = redis.call("TTL", KEYS[1])

return {1, limit-count-1, ttl};