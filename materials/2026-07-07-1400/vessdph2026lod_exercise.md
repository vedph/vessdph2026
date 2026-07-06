## Abstract

In the practical part of the workshop, with the help of a ['toy app'](https://summer-lod.fusi-soft.com) developed by Daniele Fusi, attendants enrich a TEI XML file of a letter by Veronica Franco by including references to LOD entities representing people and places, a typical real-world application scenario for LOD technologies. Course attendants find out the LOD URIs for entities *Enrico III* (Henry III), *Francia* (France) and *Polonia* (Poland) on DBPedia and mark their names in Veronica Franco's text with the relevant TEI markup, pointing to those URIs. Then they use the toy app to generate its HTML visualization, to pull data about those entities from the Semantic Web (namely, from DBPedia) and to visualize that data.

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




## Exercise

### Files to download

Use the top-right 'download raw file' button ![download button](https://raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/gitbhub-download-detail.png) to download the files:


1. ['Incomplete' version](https://raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/XML/1.franco_incomplete.xml) of the TEI XML file
2. ['Complete' version](https://raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/XML/2.franco_complete.xml)



### Step 1

#### What you are doing

You start from a TEI XML file of Veronica Franco's letter, in which Henry III, France and Poland are mentioned, but in which the semantic markup regarding places and people is incomplete. In step 1 we simply download and inspect this file.


#### Why you are doing it

This is the base file that you will connect with LOD entities in the next steps. The scenario we are mimicking is a very common one: imagine that, in your research project, you have a TEI-encoded text that you want to enrich with semantic markup.

#### How to do it

1. Download the ['incomplete' version](https://raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/XML/1.franco_incomplete.xml) of the TEI XML file
    - Use the top-right 'download raw file' button ![download button](https://raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/gitbhub-download-detail.png)
2. Save the file in a folder of your computer where you will be able to find it later
3. Open it with your XML editor to check if the download worked
4. Keep it open in your XML editor, for the next step

### What to do if anything goes wrong

No problem: in the worst case scenario, the website already has a working TEI XML file, so you don't really have to upload your one.











### Step 2

#### What you are doing

You find out the LOD URIs for:

Entity    | Italian       | Type   | URI to find | Optional additional URIs
---       | ---           | ---    | ---         | ---
Henry III | *Henrico III* | person | DBPedia     | Wikidata, VIAF, Katalog der Deutschen Nationalbibliothek (D-NB)
France    | *Francia*     | place  | DBPedia     |
Poland    | *Polonia*     | place  | DBPedia     |



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

1. Recogito
    - Use a NER (Named Entity Recognition) tool such as [Recogito](https://recogito.pelagios.org)
2. Login
    - Register by creating a free account, then login
3. Upload XML
    - Upload your TEI XML document: click on 'New' (top left) ![new](raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/recogito1.jpg)
4. Open it
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

Find the relevant URIs in the *How to do it* section of the next step and skip to it.










### Step 3

#### What you are doing

Add the relevant URIs to your TEI markup (`<place>` and `<person>` elements in the `<teiHeader>`).


#### Why you are doing it

So the semantic markup of your TEI XML file is actually linked to the Semantic Web and (among other things) your digital edition can pull information from it.

#### How to do it

1. Find the `§020 Insert person`, the `§030 Insert first place` and the `§040 Insert second place` bookmarks in the 'incomplete' TEI XML file (`1.franco_incomplete.xml`)
1.franco_incomplete.xml
1.franco_incomplete.xml
1.franco_incomplete.xml 1.franco_incomplete.xml
§§§
2. Replace the "§" placeholders (e. g the "§" in `<idno type="dbpedia">§</idno>`) with the relevant LOD URIs, i.e.:

Entity   | URI      | URI
---      | ---      | ---
Iuno     | DBPedia  | <http://dbpedia.org/resource/Juno_(mythology)>
Iuno     | Wikidata | <http://www.wikidata.org/entity/Q125046>
Iuno     | VIAF     | <http://viaf.org/viaf/47558229>
Iuno     | D-NB     | <http://d-nb.info/gnd/118800574>
Troia    | DBPedia  | <http://dbpedia.org/resource/Troy>
Troia    | VIAF     | <http://viaf.org/viaf/241435491>
Lavinium | DBPedia  | <http://dbpedia.org/resource/Lavinium>
Lavinium | VIAF     | <http://viaf.org/viaf/243024149>
Italia   | DBPedia  | <http://dbpedia.org/resource/Italy>
Italia   | VIAF     | <http://viaf.org/viaf/152361066>

*Note*: DBPedia URIs should start with `http`, not with `https`, and include `resource`, not `page`. For example, <http://dbpedia.org/resource/Italy> is OK, but <https://dbpedia.org/page/Italy> is not.



#### What to do if anything goes wrong

- Download the ['complete' version](https://github.com/SunoikisisDC/SunoikisisDC-2025-2026/blob/main/data/Summer-2026-Session-4/XML/2.franco_complete.xml) of the TEI XML file, in which all URIs have been included, so you are ready for the next steps
    - Use the top-right 'download raw file' button ![download button](raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/gitbhub-download-detail.png)
    - Please note in which folder you are downloading this file. You can replace the previous version and resume work from the 'complete' file for the next steps





### Step 4

#### What you are doing

Connect the `<personName>` and the `<placeName>` elements in the TEI `<text>` to the `<place>` and `<person>` elements in the TEI `<teiHeader>`.


#### Why you are doing it

Because this is the TEI Guidelines strategy: the `<text>` points to the to `<teiHeader>`, and the latter inlcudes the LOD URIs.

#### How to do it

1. Find the `§040` bookmark in the 'incomplete' TEI XML file (`1.franco_incomplete.xml`)
2. Replace the "§" placeholders (e. g the "§" in `<placeName ref="§">Troiae</placeName`) with pointers to the `xml:id` of the relevant `<person>` or `<place>` in the `<teiHeader>` (e.g. `pl_troia` for Troy). Remember that in XML pointers start with `#`, so the result for Troy should look like `<placeName ref="#pl_troia">Troiae</placeName>`.



#### What to do if anything goes wrong

- Download the ['complete' version](https://github.com/SunoikisisDC/SunoikisisDC-2025-2026/blob/main/data/Summer-2026-Session-4/XML/2.franco_complete.xml) of the TEI XML file, in which all TEI markup has been completed, so you are ready for the next steps
    - Use the top-right 'download raw file' button ![download button](raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/gitbhub-download-detail.png)
    - Please note in which folder you are downloading this file. You can replace the previous version and resume work from the 'complete' file for the next steps










### Step 5

#### What you are doing

You upload the updated TEI XML file to the website <https://summer-lod.fusi-soft.com>, which includes software that will process it.



#### Why you are doing it

The [website](https://summer-lod.fusi-soft.com/) already includes a default version of our TEI XML file, but you may provide it with your own version (thus mimicking a real-world workflow).

#### How to do it

1. Make sure that you have a working, valid and complete TEI XML file
2. If you're not sure, or if anything is wrong or missing in your TEI XML file, download the ['complete' version](https://github.com/SunoikisisDC/SunoikisisDC-2025-2026/blob/main/data/Summer-2026-Session-4/XML/aen_complete.xml)
3. Visit the website <https://summer-lod.fusi-soft.com> and locate the button bar, just behind the XML and XSLT code windows: ![button bar](raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/button-all.jpg)
4. Upload the updated TEI XML file by clicking on the *Load XML from file* button: ![load from XML button](raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/button-upload-xml.jpg)


#### What to do if anything goes wrong

Not much: you need this starting file for the next steps.





### Step 6

#### What you are doing

You generate the HTML visualization based on your updated XML, and the XSLT.

#### Why you are doing it

To see the typical XML → XSLT → HTML pipeline in action.

#### How to do it

1. Click on the *Transform XML with XSLT* button: ![transform XML with XSLT](raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/button-transform.jpg)
2. Check the visualization that appears in the *HTML* box of the [website](https://summer-lod.fusi-soft.com/), behind the source code and the ![button bar](raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/button-all.jpg)

#### What to do if anything goes wrong

This step is not directly relevant to LOD: if things don't go your way, just skip to the next step.






### Step 7

#### What you are doing

You run the "Parse XML entities" function of the [website](https://summer-lod.fusi-soft.com/), which pulls data about our entities from the Semantic Web (namely, from DBPedia: this is why in our exercise only the DBPedia URI was mandatory, while other URIs were optional).

#### Why you are doing it

So you can see the power of LOD in action!

#### How to do it

1. Click on the *Parse XML entities* button ![parse XML entities](raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/button-parse.jpg)
2. Check the entities list in the new window that has appeared just above the map
3. Click on the *View details* button ![view details](raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/button-info.jpg) for each entity and check the *Details* window that appears. Where does this information come from? Is it encoded in the TEI XML file?
4. Switch the language of the abstract in the dropdown menu
5. Click on the *Fly to this location* button ![fly to this location](raw.githubusercontent.com/vedph/vessdph2026/main/materials/2026-07-07-1400/button_images/button-fly.jpg) in the Lavinium row (or in any other row of a place) and check the map. Where does the geographical information (latitude, longitude) come from? Is it encoded in the TEI XML file?
6. Does the system show any geographical information for people (Juno)? Why?

#### What to do if anything goes wrong

Not much, but please drop us a line to let us know that the LOD parsing didn't work for you.
