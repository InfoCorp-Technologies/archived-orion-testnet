A contract deployed to the network run simultaneously with Exchange service to save exchange events.

Exchange contract consists of 3 main functions:

1. exchange(uint total, string fromCurrency, string toCurrency): to listen a request to exchange a total of money 
from a kind of currency to another. Firing an Exchange event with an id and adding the exchange id in the waiting 
list. The corresponding value with the id is set to 'false' as it is waiting to be processed by Exchange service.

2. callback(uint exchangeId, uint result): Called by Exchange service. To fire a Result event and mark the process 
with exchangeId in the waiting list 'processed' (true). 

3. checkPending(uint exchangeId): to check whether the service processed the request with the provided exchangeId.
