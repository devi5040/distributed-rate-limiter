local existing = redis.call('HMGET', KEYS[1], 'tokens', 'lastRefill')
local capacity = tonumber(ARGV[2])
local cost = tonumber(ARGV[1])
local now = redis.call("TIME")
local time = tonumber(now[1])
local existingToken = tonumber(existing[1])
local existingLastRefill = tonumber(existing[2])
local refillRate = tonumber(ARGV[3])
if(cost>capacity) then
    return {0, 0, 0}
end
local ttl = redis.call('TTL', KEYS[1])
if(not existingToken and not existingLastRefill) then
    redis.call('HSET', KEYS[1], 'tokens',capacity-cost, 'lastRefill',time)
    redis.call('EXPIRE', KEYS[1], 3600)
    ttl = redis.call('TTL', KEYS[1])
    return {1, tonumber(capacity)-tonumber(cost), ttl}
end
local elapsed = time - existingLastRefill
local newTokens = math.min(capacity, existingToken + elapsed*refillRate )
if(newTokens>=cost) then
    newTokens=newTokens - cost
    redis.call('HSET', KEYS[1],  'tokens',tonumber(newTokens), 'lastRefill',time)
    redis.call('EXPIRE', KEYS[1], 3600)
    ttl = redis.call('TTL', KEYS[1])
    return {1, newTokens, ttl}
end
return {0,0,ttl}