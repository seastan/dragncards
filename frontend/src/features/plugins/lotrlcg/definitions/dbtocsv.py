import json

with open("cardDb.json") as f:
    d = json.load(f)

cardkeys = list(d["2b724cca-d2f1-4012-8567-4223d3842aa5"].keys())
cardkeys.remove('sides')
facekeys = list(d["2b724cca-d2f1-4012-8567-4223d3842aa5"]["sides"]["A"].keys())
#cardkeys.append(facekeys)

outcsv = [cardkeys + facekeys + ["imageUrl", "cardBack", "side"]]

for uuid, card in d.items():
    row = [card[k] for k in cardkeys]
    row += [card["sides"]["A"][k] for k in facekeys]
    row += ["https://dragncards-lotrlcg.s3.amazonaws.com/cards/English/"+uuid+".jpg"]
    if card["sides"]["B"]["name"] == "player":
        row += ["player"]
    elif card["sides"]["B"]["name"] == "encounter":
        row += ["encounter"]
    else:
        row += ["double_sided"]
        outcsv.append(row)
        row = [card[k] for k in cardkeys]
        row += [card["sides"]["B"][k] for k in facekeys]
        row += ["https://dragncards-lotrlcg.s3.amazonaws.com/cards/English/"+uuid+".B.jpg"]
        row += ["double_sided"]
    outcsv.append(row)
    #print(uuid, card["cardid"])

import csv

with open("cardDb.csv", "w") as f:
    writer = csv.writer(f)
    writer.writerows(outcsv)