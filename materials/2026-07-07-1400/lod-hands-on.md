## Abstract

In the hand-son part of the lesson, with the help of a ['toy app'](https://summer-lod.fusi-soft.com) developed by Daniele Fusi, attendants enrich a TEI XML file of a letter by Veronica Franco by including references to LOD entities representing people and places, a typical real-world application scenario for LOD technologies. Course attendants find out the LOD URIs for entities *Enrico III* (Henry III), *Francia* (France) and *Polonia* (Poland) on DBPedia and mark their names in Veronica Franco's text with the relevant TEI markup, pointing to those URIs. Then they use the toy app to generate its HTML visualization, to pull data about those entities from the Semantic Web (namely, from DBPedia) and to visualize that data.

## Software needed

- An XML editor of your choice
    - Examples include XML Copy Editor, Oxygen (with academic license) or Visual Studio Code (with extension Scholarly XML)
    - In fact, any simple text editor can edit an XML file, but this software will give you additional functionalities useful when editing XML professionaly
    - The instructions to download and install Oxygen or Visual Studio Code have been provided in the materials of the lesson taught by Marina Buzzoni, Chiara De Bastiani and Paola Peratello

## Resources

- Tools online
    - [Companion software on D. Fusi's website](https://summer-lod.fusi-soft.com)
    - [Recogito NER](https://recogito.pelagios.org)
- Some LOD resources
    - <https://www.dbpedia.org/>
    - <https://www.wikidata.org/>
    - <https://lod-cloud.net/>




## Hands-on activity

### Files to download

Use the top-right 'download raw file' button ![download button](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/gitbhub-download-detail.png) to download the files:


1. ['Incomplete' version](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/XML/1.franco_incomplete.xml) of the TEI XML file
2. ['Complete' version](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/XML/2.franco_complete.xml)



### Step 1

#### What to do

Start from a TEI XML file of Veronica Franco's letter, in which Henry III, France and Poland are mentioned, but in which the semantic markup regarding places and people is incomplete. In step 1 we simply download and inspect this file.


#### Why you are doing it

This is the base file that you will connect with LOD entities in the next steps. The scenario we are mimicking is a very common one: imagine that, in your research project, you have a TEI-encoded text that you want to enrich with semantic markup.

#### How to do it

1. Download the ['incomplete' version](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/XML/1.franco_incomplete.xml) of the TEI XML file
    - Use the top-right 'download raw file' button ![download button](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/gitbhub-download-detail.png)
2. Save the file in a folder of your computer where you will be able to find it later
3. Open it with your XML editor to check if the download worked
4. Keep it open in your XML editor, for the next step

### What to do if anything goes wrong

No problem: in the worst case scenario, the website already has a working TEI XML file, so you don't really have to upload your one.











### Step 2

#### What to do

Find out the LOD URIs for:

Entity    | Italian       | Type   | URI to find | Optional additional URIs
---       | ---           | ---    | ---         | ---
Henry III | *Henrico III* | person | DBPedia     | Wikidata, VIAF, Katalog der Deutschen Nationalbibliothek (D-NB)
France    | *Francia*     | place  | DBPedia     |
Poland    | *Polonia*     | place  | DBPedia     |

...and save those URIS in a text file for later.

#### Why you are doing it

So, in the next steps, you can replace the "§" placeholders with the relevant URIs in the TEI XML file (thus linking our 'internal' semantic markup to the Semantic Web).


#### How to do it (3 approaches)
 
##### 1. DBPedia lookup (easiest, recommended for this exercise)

1. Use the search function in <https://lookup.dbpedia.org/>
    - You will see that DBPedia URIs look like `http://dbpedia.org/resource/Troy`

##### 2. DBPedia SPARQL query (geeky approach)

1. Go to <https://dbpedia.org/sparql>
2. Paste a SPARQL query like the following one, after replacing `Troy` with the 'label' you are searching, and hit 'Execute Query':

```sparql
SELECT ?uri ?label
WHERE {
?uri rdfs:label ?label .
filter(?label="Troy"@en)
}
```

##### 3. Recogito ('production' approach)

1. Use Recogito
    - Use a NER (Named Entity Recognition) tool such as [Recogito](https://recogito.pelagios.org)
2. Login
    - Register by creating a free account, then login
3. Upload XML
    - Upload your TEI XML document: click on 'New' (top left) ![new](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/recogito1.jpg)
4. Open XML in Recogito
    - Double click on the file in the list to open it
5. Click on words
    - Click on highlighted words/phrases to review/edit the semantic markup
        - ...if Recogito fails to recognize your entities, why does it fail?
6. Manual search
    - If automatic recognition fails, click on the 'Search' button and search for a lemmatized/normalized/more common form of the name (e.g.: *Henrico III* → *Enrico III* or *Henry III*; *Polonia* → *Poland*)
7. Download
    - Once finished, click on the 'Download' button on the top horizontal menu and choose 'TEI/XML' as format (last row, 'Annotated document / TEI / TEI/XML')
8. Check downloaded file
    - Open the downloaded TEI file with your XML editor: is the `ref` markup strategy the same of our TEI file?

*Note*: We won't be using the TEI file you downloaded from Recogito for the rest of this exercise, because it is encoded differently. We will continue using our 'incomplete' file.


#### What to do if anything goes wrong

Simply skip to the *How to do it* section of the next step and use the URIs listed there.










### Step 3

#### What to do

Add the relevant URIs to your TEI markup (`<place>` and `<person>` elements in the `<teiHeader>`).


#### Why you are doing it

So the semantic markup of your TEI XML file is actually linked to the Semantic Web and (among other things) your digital edition can pull information from it.

#### How to do it

1. Find the `§020 Insert person`, the `§030 Insert first place` and the `§040 Insert second place` bookmarks in the 'incomplete' TEI XML file (`1.franco_incomplete.xml`)
2. Replace the `"§"` placeholders (e. g the "§" in `<idno type="dbpedia">§</idno>`) with the relevant LOD URIs that you have found in the previous step. If you couldn't find them, here they are:





Entity              | URI      | URI
---                 | ---      | ---
Henry III of France | DBPedia  | http://dbpedia.org/resource/Henry_III_of_France
Henry III of France | Wikidata | http://www.wikidata.org/entity/Q53448
Henry III of France | VIAF     | http://viaf.org/viaf/5774506
Henry III of France | D-NB     | http://d-nb.info/gnd/118773720
France              | DBPedia  | http://dbpedia.org/resource/France
Poland              | DBPedia  | http://dbpedia.org/resource/Poland

*Note*: DBPedia URIs should start with `http`, not with `https`, and include `resource`, not `page`. For example, <http://dbpedia.org/resource/Italy> is OK, but <https://dbpedia.org/page/Italy> is not:
<https://dbpedia.org/page/Italy>, instead, is the *URL* of the *textual webpage* (regular Web, not Semantic Web) that DBPedia automatically generates to display the content of the LOD resource to human readers.



#### What to do if anything goes wrong

- Download the ['complete' version](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/XML/2.franco_complete.xml) of the TEI XML file, in which all URIs have been included, so you are ready for the next steps. To download it:
    - Use the top-right 'download raw file' button ![download button](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/gitbhub-download-detail.png)
    - Please note in which folder you are downloading this file





### Step 4

#### What to do

Connect the `<personName>` and the `<placeName>` elements in the TEI `<text>` to the `<place>` and `<person>` elements in the TEI `<teiHeader>`.


#### Why you are doing it

Because this is the TEI Guidelines strategy: the `<text>` points to the to `<teiHeader>`, and the latter inlcudes the LOD URIs.


#### How to do it

1. Find the bookmark `§050 Insert references` in the 'incomplete' TEI XML file (`1.franco_incomplete.xml`)
2. Replace the "§" placeholders (e. g the "§" in `<persName ref="§">HENRICO III</persName>`) with pointers to the `xml:id` of the relevant `<person>` or `<place>` in the `<teiHeader>` (e.g. `pl_poland` for Poland). Remember that in XML pointers start with `#`, so the result for Poland should look like `<placeName ref="#pl_poland">` etc.



#### What to do if anything goes wrong

- Download the ['complete' version](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/XML/2.franco_complete.xml) of the TEI XML file, in which all URIs have been included, so you are ready for the next steps. To download it:
    - Use the top-right 'download raw file' button ![download button](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/gitbhub-download-detail.png)
    - Please note in which folder you are downloading this file










### Step 5

#### What to do

Upload the updated TEI XML file to the [toy app https://summer-lod.fusi-soft.com](https://summer-lod.fusi-soft.com), which includes software that will process it.



#### Why you are doing it

The [toy app](https://summer-lod.fusi-soft.com/) already includes a default version of our TEI XML file, but you may provide it with your own version (thus mimicking a real-world workflow).

#### How to do it

1. Make sure that you have a working, valid and complete TEI XML file
2. If you're not sure, or if anything is wrong or missing in your TEI XML file, download the ['complete' version](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/XML/2.franco_complete.xml)
3. Visit the [toy app](https://summer-lod.fusi-soft.com)
4. Upload the updated TEI XML file by clicking on the *Load XML from file* button: ![load from XML button](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/button-upload-xml.jpg)
    - The button bar is located just behind the XML and XSLT code windows: ![button bar](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/button-all.jpg)


#### What to do if anything goes wrong

If you can't upload your own version of the XML file, you can simply refresh/reload the webpage of the [toy app](https://summer-lod.fusi-soft.com) and use the XML file pre-loaded there.





### Step 6

#### What to do

Generate the HTML visualization based on your updated XML and the XSLT (the latter is pre-loaded in the [toy app](https://summer-lod.fusi-soft.com)).

#### Why you are doing it

To see the typical XML → XSLT → HTML pipeline, commonly usedi to visualize XML data for humans, in action.

#### How to do it

1. Click on the *Transform XML with XSLT* button: ![transform XML with XSLT](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/button-transform.jpg)
2. Check the visualization that appears in the *HTML* box of the [website](https://summer-lod.fusi-soft.com/), behind the source code and the ![button bar](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/button-all.jpg)

#### What to do if anything goes wrong

This step is not directly relevant to LOD: if things don't go your way, just skip to the next step.






### Step 7

#### What to do

Run the "Parse XML entities" function of the [toy app](https://summer-lod.fusi-soft.com/), which pulls data regarding our entities from the Semantic Web (namely from DBPedia: this is why only the DBPedia URIs were mandatory in previous steps, while other URIs were optional).

#### Why you are doing it

So you can see the power of LOD in action!

#### How to do it

1. Click on the *Parse XML entities* button ![parse XML entities](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/button-parse.jpg)
2. Check the entities list in the new window that has appeared just above the map
3. Click on the *View details* button ![view details](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/button-info.jpg) for each entity and check the *Details* window that appears
    - Where does this information come from? Is it encoded in the TEI XML file?
4. Switch the language of the abstract in the dropdown menu
5. For places, click on the *Fly to this location* button ![fly to this location](https://github.com/vedph/vessdph2026/raw/refs/heads/main/materials/2026-07-07-1400/button_images/button-fly.jpg) and check the map
    - Where does the geographical information (latitude, longitude) come from? Is it encoded in the TEI XML file?
6. Does the system show any geographical information for people (Henrty III)?
    - Why? (Sure, conceptually it doesn't make sense; but technically, why it doesn't happen?)

#### What to do if anything goes wrong

Not much, unfortunately, but please let us know if the LOD parsing didn't work for you, so Daniele Fusi can fix it.
